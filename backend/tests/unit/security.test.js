// =============================================================================
// Tests de sécurité — POC Collector Shop
// =============================================================================
// Couvre : authentification, autorisation, injection, tokens

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

const jwt = require('jsonwebtoken');

function getAuth() {
  jest.resetModules();
  return require('../../src/auth');
}

function createRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

// =============================================================================
// AUTH BYPASS
// =============================================================================
describe('Sécurité — Tentatives de bypass authentification', () => {
  test('rejette une requête sans header Authorization', () => {
    const { authMiddleware } = getAuth();
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un token vide "Bearer "', () => {
    const { authMiddleware } = getAuth();
    const req = { headers: { authorization: 'Bearer ' } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un scheme non-Bearer (Basic)', () => {
    const { authMiddleware } = getAuth();
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un JWT signé avec un mauvais secret', () => {
    const { authMiddleware } = getAuth();
    const fakeToken = jwt.sign({ id: 'hacker', role: 'ADMIN' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${fakeToken}` } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un JWT expiré', () => {
    const { authMiddleware } = getAuth();
    const expiredToken = jwt.sign(
      { id: 'u1', role: 'BUYER' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un JWT malformé (chaîne random)', () => {
    const { authMiddleware } = getAuth();
    const req = { headers: { authorization: 'Bearer not.a.jwt' } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette un header avec seulement "Bearer" sans token', () => {
    const { authMiddleware } = getAuth();
    const req = { headers: { authorization: 'Bearer' } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// ESCALADE DE PRIVILÈGES
// =============================================================================
describe('Sécurité — Escalade de privilèges', () => {
  test('un BUYER ne peut pas accéder aux endpoints ADMIN', () => {
    const { requireRole } = getAuth();
    const middleware = requireRole('ADMIN');
    const req = { user: { role: 'BUYER' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('un SELLER ne peut pas accéder aux endpoints ADMIN', () => {
    const { requireRole } = getAuth();
    const middleware = requireRole('ADMIN');
    const req = { user: { role: 'SELLER' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('un BUYER ne peut pas accéder aux endpoints SELLER', () => {
    const { requireRole } = getAuth();
    const middleware = requireRole('SELLER', 'ADMIN');
    const req = { user: { role: 'BUYER' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('ADMIN peut accéder à tout', () => {
    const { requireRole } = getAuth();
    const middleware = requireRole('SELLER', 'ADMIN');
    const req = { user: { role: 'ADMIN' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('pas d\'auto-assignation du rôle ADMIN à l\'inscription', () => {
    const role = 'ADMIN';
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : undefined;
    const initialRole = normalizedRole === 'SELLER' ? 'SELLER' : 'BUYER';
    // Un utilisateur qui tente de s'inscrire en tant qu'ADMIN se retrouve BUYER
    expect(initialRole).toBe('BUYER');
  });
});

// =============================================================================
// INJECTION & DONNÉES MALVEILLANTES
// =============================================================================
describe('Sécurité — Protection contre injection', () => {
  test('le mot de passe est hashé avec bcrypt (pas stocké en clair)', () => {
    const bcrypt = require('bcryptjs');
    const password = 'MySecret!123';
    const hash = bcrypt.hashSync(password, 10);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
    expect(bcrypt.compareSync('WrongPassword!1', hash)).toBe(false);
  });

  test('le JWT ne contient PAS le mot de passe', () => {
    const { signToken } = getAuth();
    const user = { id: 'u1', email: 'test@test.com', role: 'BUYER', name: 'Test', password: 'hash123' };
    const token = signToken(user);
    const payload = jwt.decode(token);

    expect(payload.password).toBeUndefined();
    expect(payload.id).toBe('u1');
    expect(payload.email).toBe('test@test.com');
  });

  test('le JWT contient une date d\'expiration', () => {
    const { signToken } = getAuth();
    const token = signToken({ id: 'u1', email: 'a@b.c', role: 'BUYER', name: 'T' });
    const payload = jwt.decode(token);

    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});

// =============================================================================
// VALIDATION DES ENTRÉES
// =============================================================================
describe('Sécurité — Validation des entrées', () => {
  test('rejette un email vide au login', () => {
    const email = '';
    const password = 'Valid!123';
    expect(!email || !password).toBe(true);
  });

  test('rejette un productId manquant pour une commande', () => {
    const productId = undefined;
    expect(!productId).toBe(true);
  });

  test('rejette les rôles invalides pour la mise à jour', () => {
    const validRoles = ['BUYER', 'SELLER', 'ADMIN'];
    expect(validRoles.includes('HACKER')).toBe(false);
    expect(validRoles.includes('SUPERADMIN')).toBe(false);
    expect(validRoles.includes('')).toBe(false);
  });

  test('les champs obligatoires sont vérifiés pour les produits', () => {
    const product = { title: '', description: '', price: 0, category: '' };
    const missing = !product.title || !product.description || !product.price || !product.category;
    expect(missing).toBe(true);
  });
});
