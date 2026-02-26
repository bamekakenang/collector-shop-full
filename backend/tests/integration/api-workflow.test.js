// =============================================================================
// Tests d'intégration API — Parcours complet POC Collector Shop
// =============================================================================
// Scénario testé :
//   1. Health check
//   2. Inscription buyer (compte inactif)
//   3. Inscription seller (compte inactif + demande vendeur)
//   4. Login refusé (compte inactif)
//   5. Admin login
//   6. Admin approuve le buyer
//   7. Admin approuve la demande seller
//   8. Buyer login réussi
//   9. Seller login réussi
//  10. Seller crée un produit (status: pending)
//  11. Admin approuve le produit
//  12. Buyer consulte les produits
//  13. Buyer passe une commande
//  14. Admin liste les utilisateurs
//  15. Admin rejette un produit
//  16. Admin supprime un produit

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const request = require('supertest');

// Env setup
process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

const backendRoot = path.resolve(__dirname, '../..');

let app, prisma, tmpDir;

beforeAll(async () => {
  // Create isolated temp SQLite DB
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-it-'));
  const dbPath = path.join(tmpDir, 'test.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  // Apply migrations
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    stdio: 'pipe',
    env: process.env,
  });

  // Import app after DB is configured
  ({ app } = require('../../src/server'));
  ({ prisma } = require('../../src/prisma'));

  // Seed admin account
  const hash = await bcrypt.hash('Admin!234', 10);
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@test.local', password: hash, role: 'ADMIN', active: true },
  });
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

// ========== Variables partagées entre tests ==========
let adminToken;
let buyerToken;
let sellerToken;
let createdProductId;
let secondProductId;

// =============================================================================
// 1. HEALTH CHECK
// =============================================================================
describe('1. Health Check', () => {
  test('GET /api/health → 200 { status: "ok" }', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});

// =============================================================================
// 2. INSCRIPTION
// =============================================================================
describe('2. Inscription des utilisateurs', () => {
  test('Inscription buyer → 201, compte inactif', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Buyer Test', email: 'buyer@test.local', password: 'Buyer!234' })
      .expect(201);

    expect(res.body.user.role).toBe('BUYER');
    expect(res.body.user.active).toBe(false);
    expect(res.body.message).toContain('attente de validation');
  });

  test('Inscription seller → 201, compte inactif + demande vendeur', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Seller Test',
        email: 'seller@test.local',
        password: 'Seller!234',
        role: 'SELLER',
        sellerMessage: 'Je vends des sneakers authentiques',
      })
      .expect(201);

    expect(res.body.user.role).toBe('SELLER');
    expect(res.body.user.active).toBe(false);
  });

  test('Inscription avec email déjà utilisé → 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Doublon', email: 'buyer@test.local', password: 'Doublon!234' })
      .expect(400);
  });

  test('Inscription avec mot de passe faible → 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.local', password: 'short' })
      .expect(400);
  });

  test('Inscription sans mot de passe spécial → 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'NoSpecial', email: 'nospecial@test.local', password: 'Abcdefgh1' })
      .expect(400);
  });
});

// =============================================================================
// 3. LOGIN — COMPTES INACTIFS
// =============================================================================
describe('3. Login refusé pour comptes inactifs', () => {
  test('Buyer inactif → 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@test.local', password: 'Buyer!234' })
      .expect(403);

    expect(res.body.error).toContain('attente de validation');
  });

  test('Seller inactif → 403', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@test.local', password: 'Seller!234' })
      .expect(403);
  });

  test('Identifiants invalides → 401', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@test.local', password: 'WrongPass!1' })
      .expect(401);
  });

  test('Utilisateur inexistant → 401', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'Ghost!234' })
      .expect(401);
  });
});

// =============================================================================
// 4. ADMIN LOGIN
// =============================================================================
describe('4. Admin login', () => {
  test('Admin peut se connecter → 200 + token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'Admin!234' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });
});

// =============================================================================
// 5. ADMIN — GESTION DES UTILISATEURS
// =============================================================================
describe('5. Admin — Gestion des utilisateurs', () => {
  test('Admin liste les utilisateurs → 200', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('Admin active le compte buyer → 200', async () => {
    // List all users (sans filtre q= car mode:insensitive incompatible SQLite)
    const users = await request(app)
      .get('/api/admin/users?pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const buyer = users.body.items.find((u) => u.email === 'buyer@test.local');
    expect(buyer).toBeDefined();

    await request(app)
      .post(`/api/admin/users/${buyer.id}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true })
      .expect(200);
  });

  test('Admin approuve la demande seller → 200', async () => {
    const requests = await request(app)
      .get('/api/admin/seller-requests?status=pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(requests.body.length).toBeGreaterThanOrEqual(1);

    const reqId = requests.body[0].id;
    await request(app)
      .post(`/api/admin/seller-requests/${reqId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});

// =============================================================================
// 6. LOGIN — COMPTES ACTIFS
// =============================================================================
describe('6. Login après activation', () => {
  test('Buyer peut se connecter → 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@test.local', password: 'Buyer!234' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    buyerToken = res.body.token;
  });

  test('Seller peut se connecter → 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@test.local', password: 'Seller!234' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('SELLER');
    sellerToken = res.body.token;
  });
});

// =============================================================================
// 7. PRODUITS — CRÉATION ET GESTION
// =============================================================================
describe('7. Produits — Cycle de vie complet', () => {
  test('Seller crée un produit → 201, status: pending', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Nike Air Jordan 1 Chicago',
        description: 'Sneakers authentiques, portées 2 fois, état quasi-neuf. Taille 42. Livré avec boîte originale et ticket de caisse.',
        price: 350,
        shipping: 15,
        category: 'sneakers',
        images: ['https://example.com/jordan1.jpg'],
        location: 'Paris',
      })
      .expect(201);

    expect(res.body.status).toBe('pending');
    expect(res.body.title).toBe('Nike Air Jordan 1 Chicago');
    createdProductId = res.body.id;
  });

  test('Seller crée un second produit → 201', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Carte Pokémon Dracaufeu 1ère édition',
        description: 'Carte en excellent état, rangée sous sleeve et toploader depuis 10 ans. Pas de pli ni rayure visible.',
        price: 800,
        shipping: 8,
        category: 'cartes',
        images: ['https://example.com/charizard.jpg'],
      })
      .expect(201);

    secondProductId = res.body.id;
  });

  test('Buyer ne peut PAS créer de produit → 403', async () => {
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: 'Tentative non autorisée',
        description: 'Ceci ne devrait pas passer car le buyer n\'a pas le rôle SELLER ou ADMIN.',
        price: 10,
        shipping: 0,
        category: 'test',
      })
      .expect(403);
  });

  test('Admin approuve le premier produit → 200', async () => {
    const res = await request(app)
      .post(`/api/admin/products/${createdProductId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe('available');
  });

  test('Admin rejette le second produit → 200', async () => {
    const res = await request(app)
      .post(`/api/admin/products/${secondProductId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe('rejected');
  });
});

// =============================================================================
// 8. CONSULTATION PRODUITS
// =============================================================================
describe('8. Consultation des produits', () => {
  test('GET /api/products → liste tous les produits', async () => {
    const res = await request(app).get('/api/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/products/:id → détail d\'un produit', async () => {
    const res = await request(app).get(`/api/products/${createdProductId}`).expect(200);
    expect(res.body.title).toBe('Nike Air Jordan 1 Chicago');
    expect(res.body.status).toBe('available');
  });

  test('GET /api/products/inexistant → 404', async () => {
    await request(app).get('/api/products/id-inexistant-xyz').expect(404);
  });
});

// =============================================================================
// 9. COMMANDES
// =============================================================================
describe('9. Commandes', () => {
  test('Buyer crée une commande → 201', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productId: createdProductId, quantity: 1 })
      .expect(201);

    expect(res.body.status).toBe('pending');
    expect(res.body.totalPrice).toBe(365); // 350 + 15
  });

  test('Buyer consulte ses commandes → 200', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].product).toBeDefined();
  });

  test('Commande sans authentification → 401', async () => {
    await request(app)
      .post('/api/orders')
      .send({ productId: createdProductId })
      .expect(401);
  });
});

// =============================================================================
// 10. ADMIN — SUPPRESSION PRODUIT
// =============================================================================
describe('10. Admin — Suppression', () => {
  test('Admin supprime un produit → 204', async () => {
    await request(app)
      .delete(`/api/admin/products/${secondProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  test('Produit supprimé n\'existe plus → 404', async () => {
    await request(app).get(`/api/products/${secondProductId}`).expect(404);
  });
});
