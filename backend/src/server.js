require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
// Initialize Stripe only if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const { prisma } = require('./prisma');
const { signToken, authMiddleware, requireRole } = require('./auth');
const rabbitmq = require('./services/rabbitmq');

const app = express();

// File upload config
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({ storage });

// CORS durci : n'autorise que le frontend configuré
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Corrige les URLs de type /api/api/* en /api/* (double préfixe côté frontend)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  next();
});

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, address, phone, gender, sellerMessage } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont obligatoires' });
    }

    // Password strength: at least 8 chars and one special character
    const hasMinLength = password.length >= 8;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    if (!hasMinLength || !hasSpecialChar) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères et au moins un caractère spécial',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    // New policy: all new accounts are inactive until approved by an admin.
    // Le rôle demandé est enregistré (SELLER ou BUYER) mais le compte reste inactif tant qu'il n'est pas validé.
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : undefined;
    const initialRole = normalizedRole === 'SELLER' ? 'SELLER' : 'BUYER';

    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hash,
        role: initialRole,
        active: false,
        address: address || null,
        phone: phone || null,
        gender: gender || null,
      },
    });

    // If the client attempted to sign up as seller, open a seller request automatically
    if (normalizedRole === 'SELLER') {
      await prisma.sellerRequest.upsert({
        where: { userId: user.id },
        update: { status: 'pending', message: sellerMessage || null },
        create: { userId: user.id, status: 'pending', message: sellerMessage || null },
      });
    }

    return res.status(201).json({
      // No token until approved to avoid active sessions on inactive accounts
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        address: user.address,
        phone: user.phone,
        gender: user.gender,
      },
      message: "Votre compte a été créé et est en attente de validation par un administrateur.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont obligatoires' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Compte en attente de validation par un administrateur' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        address: user.address,
        phone: user.phone,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier envoyé' });
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// Stripe Checkout - single product
app.post('/api/checkout/session', authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe n\'est pas configuré côté serveur' });
    }

    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId est requis' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'available') {
      return res.status(400).json({ error: 'Produit indisponible pour le paiement' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.title,
              description: product.description.slice(0, 200),
              images: [product.image],
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: quantity && Number(quantity) > 0 ? Number(quantity) : 1,
        },
      ],
      success_url: `${frontendUrl}/?payment=success&productId=${product.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?payment=cancel&productId=${product.id}`,
      metadata: {
        productId: product.id,
        buyerId: req.user.id,
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
});

// Orders routes - Create order (simule succès paiement)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId requis' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const totalPrice = (product.price + product.shipping) * quantity;

    const order = await prisma.order.create({
      data: {
        productId: product.id,
        buyerId: req.user.id,
        totalPrice,
        status: 'pending',
      },
    });

    // Publier événement dans RabbitMQ
    await rabbitmq.publish('order.created', {
      orderId: order.id,
      productId: product.id,
      productTitle: product.title,
      buyerId: req.user.id,
      buyerEmail: req.user.email,
      totalPrice,
      quantity,
      createdAt: order.createdAt.toISOString(),
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

// Get user orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement des commandes' });
  }
});

// Products routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement des produits' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement du produit' });
  }
});

// Create product (protected: seller/admin only)
app.post('/api/products', authMiddleware, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      shipping,
      category,
      images,
      location,
    } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const authUser = req.user;
    const sellerId = authUser.id;
    const sellerName = authUser.name || authUser.email;

    const id = req.body.id || Date.now().toString();
    const image = Array.isArray(images) && images.length > 0
      ? images[0]
      : 'https://images.unsplash.com/photo-1495121553079-4c61bcce1894?auto=format&fit=crop&w=800&q=80';

    // Ensure category exists
    await prisma.category.upsert({
      where: { id: category },
      update: {},
      create: { id: category, name: category },
    });

    const now = new Date();
    const createdProduct = await prisma.product.create({
      data: {
        id,
        title,
        description,
        price: Number(price),
        shipping: Number(shipping ?? 0),
        image,
        images: Array.isArray(images) && images.length > 0 ? images : [image],
        categoryId: category,
        sellerId,
        sellerName,
        sellerRating: 5.0,
        sellerReviews: 0,
        location: location || 'France',
        status: 'pending',
        createdAt: now,
        priceHistory: [{ price: Number(price), date: now.toISOString().slice(0, 10) }],
      },
    });

    res.status(201).json(createdProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création de l'article" });
  }
});

// Update product (basic)
app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        price: data.price !== undefined ? Number(data.price) : existing.price,
        shipping:
          data.shipping !== undefined ? Number(data.shipping) : existing.shipping,
        status: data.status ?? existing.status,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
  }
});

// Admin: approve product
app.post('/api/admin/products/:id/approve', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'available' },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'approbation du produit" });
  }
});

// Admin: reject product
app.post('/api/admin/products/:id/reject', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'rejected' },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du rejet du produit' });
  }
});

// Seller request workflow
// Create or re-open a seller request for current user
app.post('/api/users/me/request-seller', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const message = req.body?.message || null;
    const existing = await prisma.sellerRequest.findUnique({ where: { userId } });
    const reqRecord = existing
      ? await prisma.sellerRequest.update({ where: { userId }, data: { status: 'pending', message } })
      : await prisma.sellerRequest.create({ data: { userId, status: 'pending', message } });
    return res.status(201).json(reqRecord);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible d'enregistrer la demande vendeur" });
  }
});

// Get current user's seller request
app.get('/api/users/me/seller-request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const reqRecord = await prisma.sellerRequest.findUnique({ where: { userId } });
    return res.json(reqRecord || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de charger la demande vendeur" });
  }
});

// Admin: list seller requests (pending by default)
app.get('/api/admin/seller-requests', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const status = (req.query.status || 'pending').toString();
    const list = await prisma.sellerRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de lister les demandes vendeur" });
  }
});

// Admin: approve request
app.post('/api/admin/seller-requests/:id/approve', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id;
    const request = await prisma.sellerRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });
    await prisma.$transaction([
      prisma.sellerRequest.update({ where: { id }, data: { status: 'approved' } }),
      prisma.user.update({ where: { id: request.userId }, data: { role: 'SELLER', active: true } }),
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible d'approuver la demande" });
  }
});

// Admin: reject request
app.post('/api/admin/seller-requests/:id/reject', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id;
    const message = req.body?.message || null;
    const request = await prisma.sellerRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });
    await prisma.sellerRequest.update({ where: { id }, data: { status: 'rejected', message } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de rejeter la demande" });
  }
});

// Admin: list users and update role
app.get('/api/admin/users', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const role = req.query.role ? String(req.query.role) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const page = Number(req.query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));

    const where = {
      ...(role ? { role } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ] } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize })
    ]);

    return res.json({
      total,
      page,
      pageSize,
      items: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, address: u.address, phone: u.phone, gender: u.gender })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de lister les utilisateurs" });
  }
});

app.post('/api/admin/users/:id/active', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id;
    const active = Boolean(req.body?.active);
    const user = await prisma.user.update({ where: { id }, data: { active } });
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de mettre à jour l'état du compte" });
  }
});

app.post('/api/admin/users/:id/role', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.body?.role;
    if (!['BUYER', 'SELLER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de mettre à jour le rôle" });
  }
});

// Admin: delete product
app.delete('/api/admin/products/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    await prisma.product.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'article" });
  }
});

function start(port = process.env.PORT || 4003) {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Backend running on http://localhost:${actualPort}`);
  });

  // Démarrer le consumer RabbitMQ
  rabbitmq.connect()
    .then(() => {
      // Consumer pour traiter les commandes
      rabbitmq.consumeOrders(async (orderData) => {
        console.log('✅ Traitement commande:', orderData.orderId);
        // Ici tu peux ajouter la logique métier:
        // - Envoyer email de confirmation
        // - Mettre à jour le stock
        // - Notifier le vendeur
        // - etc.
        
        // Exemple: mettre à jour le statut de la commande
        try {
          await prisma.order.update({
            where: { id: orderData.orderId },
            data: { status: 'processing' },
          });
          console.log(`✅ Commande ${orderData.orderId} mise à jour: processing`);
        } catch (error) {
          console.error(`❌ Erreur mise à jour commande ${orderData.orderId}:`, error.message);
        }
      });
    })
    .catch(err => {
      console.error('⚠️  RabbitMQ non disponible:', err.message);
      console.log('➡️  Le serveur continue sans RabbitMQ');
    });

  // Fermeture propre
  process.on('SIGTERM', async () => {
    console.log('SIGTERM reçu, fermeture...');
    await rabbitmq.close();
    server.close(() => {
      console.log('Serveur fermé');
      process.exit(0);
    });
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
