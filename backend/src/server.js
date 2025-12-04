require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { prisma } = require('./prisma');
const { signToken, authMiddleware, requireRole } = require('./auth');

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

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
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
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : undefined;
    const allowedRoles = ['BUYER', 'SELLER', 'ADMIN'];
    const safeRole = allowedRoles.includes(normalizedRole || '') ? normalizedRole : 'BUYER';

    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hash,
        role: safeRole,
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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
    if (!process.env.STRIPE_SECRET_KEY) {
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

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
