// Unit tests for authentication helpers

// Ensure we have a stable secret for the module under test
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');

function getAuth() {
  // Reload the module so it picks up process.env.JWT_SECRET (constant computed at import time)
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('../../src/auth');
}

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('auth helpers', () => {
  test('signToken produces a verifiable JWT containing user fields', () => {
    const { signToken } = getAuth();

    const user = { id: 'u1', email: 'user@test.local', role: 'BUYER', name: 'User' };
    const token = signToken(user);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  });

  test('authMiddleware rejects missing Authorization header', () => {
    const { authMiddleware } = getAuth();

    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('authMiddleware accepts a valid token and sets req.user', () => {
    const { signToken, authMiddleware } = getAuth();

    const user = { id: 'u2', email: 'admin@test.local', role: 'ADMIN', name: 'Admin' };
    const token = signToken(user);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: user.id, email: user.email, role: user.role, name: user.name });
  });

  test('requireRole forbids when user role is not allowed', () => {
    const { requireRole } = getAuth();

    const middleware = requireRole('ADMIN');
    const req = { user: { role: 'BUYER' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireRole passes when user role is allowed', () => {
    const { requireRole } = getAuth();

    const middleware = requireRole('ADMIN', 'SELLER');
    const req = { user: { role: 'SELLER' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
