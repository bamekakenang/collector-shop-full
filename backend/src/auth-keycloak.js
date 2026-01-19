const jwt = require('jsonwebtoken');
const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'collector-shop';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'collector-backend';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || '';

// Cache pour les clés publiques
let publicKeysCache = null;
let publicKeysCacheTime = null;
const PUBLIC_KEYS_CACHE_TTL = 3600000; // 1 heure

async function getPublicKeys() {
  const now = Date.now();
  if (publicKeysCache && publicKeysCacheTime && (now - publicKeysCacheTime) < PUBLIC_KEYS_CACHE_TTL) {
    return publicKeysCache;
  }

  try {
    const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
    const response = await axios.get(url);
    publicKeysCache = response.data.keys;
    publicKeysCacheTime = now;
    return publicKeysCache;
  } catch (error) {
    console.error('Error fetching Keycloak public keys:', error.message);
    throw new Error('Failed to fetch Keycloak public keys');
  }
}

async function verifyToken(token) {
  try {
    // Decode sans vérification pour obtenir le kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    const keys = await getPublicKeys();
    const key = keys.find(k => k.kid === decoded.header.kid);
    
    if (!key) {
      throw new Error('Public key not found');
    }

    // Construire la clé publique PEM à partir du JWK
    const jwkToPem = require('jwk-to-pem');
    const publicKey = jwkToPem(key);

    // Vérifier le token
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`
    });

    return payload;
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw error;
  }
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = await verifyToken(token);
    
    // Extraire les informations utilisateur du token Keycloak
    req.user = {
      id: payload.sub,
      email: payload.email || payload.preferred_username,
      name: payload.name || payload.preferred_username,
      role: extractRole(payload),
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function extractRole(payload) {
  // Keycloak stocke les rôles dans realm_access.roles ou resource_access
  const realmRoles = payload.realm_access?.roles || [];
  const clientRoles = payload.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles || [];
  
  const allRoles = [...realmRoles, ...clientRoles];
  
  if (allRoles.includes('ADMIN') || allRoles.includes('admin')) {
    return 'ADMIN';
  }
  if (allRoles.includes('SELLER') || allRoles.includes('seller')) {
    return 'SELLER';
  }
  return 'BUYER';
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function exchangeCodeForToken(code, redirectUri) {
  try {
    const tokenEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', KEYCLOAK_CLIENT_ID);
    params.append('client_secret', KEYCLOAK_CLIENT_SECRET);
    params.append('redirect_uri', redirectUri);

    const response = await axios.post(tokenEndpoint, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange code for token');
  }
}

async function refreshAccessToken(refreshToken) {
  try {
    const tokenEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', KEYCLOAK_CLIENT_ID);
    params.append('client_secret', KEYCLOAK_CLIENT_SECRET);

    const response = await axios.post(tokenEndpoint, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh token');
  }
}

module.exports = { 
  authMiddleware, 
  requireRole,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken
};
