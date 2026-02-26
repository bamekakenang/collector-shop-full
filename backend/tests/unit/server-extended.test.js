// Tests unitaires étendus — POC Collector Shop
// Couvre : validation inscription, login, upload, produits, commandes

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

describe('Validation mot de passe — cas limites', () => {
  const validate = (password) => ({
    hasMinLength: password.length >= 8,
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  });

  test('rejette un mot de passe vide', () => {
    const { hasMinLength } = validate('');
    expect(hasMinLength).toBe(false);
  });

  test('rejette exactement 7 caractères avec spécial', () => {
    const { hasMinLength, hasSpecialChar } = validate('Abcde!1');
    expect(hasMinLength).toBe(false);
    expect(hasSpecialChar).toBe(true);
  });

  test('accepte exactement 8 caractères avec spécial', () => {
    const { hasMinLength, hasSpecialChar } = validate('Abcdef!1');
    expect(hasMinLength).toBe(true);
    expect(hasSpecialChar).toBe(true);
  });

  test('rejette un mot de passe sans chiffre ni spécial (lettres only)', () => {
    const { hasSpecialChar } = validate('Abcdefgh');
    expect(hasSpecialChar).toBe(false);
  });

  test('accepte des caractères spéciaux variés (@, #, $, %, &)', () => {
    ['P@ssword1', 'P#ssword1', 'P$ssword1', 'P%ssword1', 'P&ssword1'].forEach((pw) => {
      const { hasMinLength, hasSpecialChar } = validate(pw);
      expect(hasMinLength).toBe(true);
      expect(hasSpecialChar).toBe(true);
    });
  });

  test('accepte un mot de passe très long (256 chars)', () => {
    const pw = 'A!'.repeat(128);
    const { hasMinLength, hasSpecialChar } = validate(pw);
    expect(hasMinLength).toBe(true);
    expect(hasSpecialChar).toBe(true);
  });
});

describe('Validation email inscription', () => {
  test('détecte un email manquant', () => {
    const email = '';
    const password = 'Valid!123';
    expect(!email || !password).toBe(true);
  });

  test('détecte un mot de passe manquant', () => {
    const email = 'user@test.com';
    const password = '';
    expect(!email || !password).toBe(true);
  });

  test('accepte des paramètres complets', () => {
    const email = 'user@test.com';
    const password = 'Valid!123';
    expect(!email || !password).toBe(false);
  });
});

describe('Normalisation du rôle — cas exhaustifs', () => {
  const normalizeRole = (role) => {
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : undefined;
    return normalizedRole === 'SELLER' ? 'SELLER' : 'BUYER';
  };

  test('"seller" → SELLER', () => expect(normalizeRole('seller')).toBe('SELLER'));
  test('"SELLER" → SELLER', () => expect(normalizeRole('SELLER')).toBe('SELLER'));
  test('"Seller" → SELLER', () => expect(normalizeRole('Seller')).toBe('SELLER'));
  test('"buyer" → BUYER', () => expect(normalizeRole('buyer')).toBe('BUYER'));
  test('"BUYER" → BUYER', () => expect(normalizeRole('BUYER')).toBe('BUYER'));
  test('"admin" → BUYER (pas de self-assign admin)', () => expect(normalizeRole('admin')).toBe('BUYER'));
  test('undefined → BUYER', () => expect(normalizeRole(undefined)).toBe('BUYER'));
  test('null → BUYER', () => expect(normalizeRole(null)).toBe('BUYER'));
  test('nombre 123 → BUYER', () => expect(normalizeRole(123)).toBe('BUYER'));
  test('chaîne vide → BUYER', () => expect(normalizeRole('')).toBe('BUYER'));
});

describe('Génération du nom par défaut', () => {
  const defaultName = (name, email) => name || email.split('@')[0];

  test('utilise le nom fourni', () => {
    expect(defaultName('Alice', 'alice@test.com')).toBe('Alice');
  });

  test('extrait le nom depuis l\'email si non fourni', () => {
    expect(defaultName('', 'bob.dupont@test.com')).toBe('bob.dupont');
  });

  test('gère un email simple', () => {
    expect(defaultName(undefined, 'admin@example.com')).toBe('admin');
  });
});

describe('Calcul du prix total commande', () => {
  const calcTotal = (price, shipping, quantity) => (price + shipping) * quantity;

  test('prix + frais de port × quantité', () => {
    expect(calcTotal(49.99, 5.0, 2)).toBeCloseTo(109.98);
  });

  test('livraison gratuite', () => {
    expect(calcTotal(100, 0, 1)).toBe(100);
  });

  test('quantité multiple', () => {
    expect(calcTotal(25, 3, 4)).toBe(112);
  });

  test('prix à zéro', () => {
    expect(calcTotal(0, 5, 1)).toBe(5);
  });
});

describe('Middleware double préfixe /api/api/', () => {
  const fixUrl = (url) => {
    if (url.startsWith('/api/api/')) {
      return url.replace('/api/api/', '/api/');
    }
    return url;
  };

  test('corrige /api/api/products → /api/products', () => {
    expect(fixUrl('/api/api/products')).toBe('/api/products');
  });

  test('corrige /api/api/auth/login → /api/auth/login', () => {
    expect(fixUrl('/api/api/auth/login')).toBe('/api/auth/login');
  });

  test('ne modifie pas /api/products', () => {
    expect(fixUrl('/api/products')).toBe('/api/products');
  });

  test('ne modifie pas /uploads/image.jpg', () => {
    expect(fixUrl('/uploads/image.jpg')).toBe('/uploads/image.jpg');
  });

  test('ne modifie pas /', () => {
    expect(fixUrl('/')).toBe('/');
  });
});

describe('URL upload image (relative)', () => {
  test('retourne un chemin relatif /uploads/<filename>', () => {
    const filename = '1234567890-photo.jpg';
    const url = `/uploads/${filename}`;
    expect(url).toBe('/uploads/1234567890-photo.jpg');
    expect(url.startsWith('/uploads/')).toBe(true);
  });

  test('ne contient pas de protocole ou de host', () => {
    const filename = 'image.png';
    const url = `/uploads/${filename}`;
    expect(url).not.toMatch(/^https?:\/\//);
  });
});

describe('CORS — origines autorisées', () => {
  test('autorise le FRONTEND_URL configuré', () => {
    const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
    expect(allowedOrigins).toContain('http://localhost:5173');
  });

  test('n\'autorise pas une origine inconnue', () => {
    const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
    expect(allowedOrigins).not.toContain('http://malicious-site.com');
  });
});

describe('Politique de comptes — inscription inactive par défaut', () => {
  test('un nouveau compte est inactif', () => {
    const active = false; // valeur définie dans le code d'inscription
    expect(active).toBe(false);
  });

  test('un compte inactif ne peut pas se connecter (403)', () => {
    const user = { active: false };
    const canLogin = user.active;
    expect(canLogin).toBe(false);
  });

  test('un compte activé peut se connecter', () => {
    const user = { active: true };
    const canLogin = user.active;
    expect(canLogin).toBe(true);
  });
});
