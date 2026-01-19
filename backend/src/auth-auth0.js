const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

if (!AUTH0_DOMAIN) {
  throw new Error('AUTH0_DOMAIN environment variable is required');
}

// Client JWKS pour récupérer les clés publiques Auth0
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 3600000, // 1 heure
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = await verifyToken(token);
    
    // Extraire les informations utilisateur du token Auth0
    req.user = {
      id: payload.sub,
      email: payload.email || payload[`${AUTH0_AUDIENCE}/email`],
      name: payload.name || payload.nickname || payload.email,
      role: extractRole(payload),
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function extractRole(payload) {
  // Auth0 peut stocker les rôles dans différents endroits selon la configuration
  // Par défaut, on utilise les custom claims avec le namespace de l'application
  const roles = payload[`${AUTH0_AUDIENCE}/roles`] || 
                payload.roles || 
                payload['https://collector-shop.com/roles'] ||
                [];
  
  if (Array.isArray(roles)) {
    if (roles.includes('ADMIN') || roles.includes('admin')) {
      return 'ADMIN';
    }
    if (roles.includes('SELLER') || roles.includes('seller')) {
      return 'SELLER';
    }
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
    const tokenEndpoint = `https://${AUTH0_DOMAIN}/oauth/token`;
    
    const data = {
      grant_type: 'authorization_code',
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    };

    const response = await axios.post(tokenEndpoint, data, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange code for token');
  }
}

async function refreshAccessToken(refreshToken) {
  try {
    const tokenEndpoint = `https://${AUTH0_DOMAIN}/oauth/token`;
    
    const data = {
      grant_type: 'refresh_token',
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      refresh_token: refreshToken,
    };

    const response = await axios.post(tokenEndpoint, data, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh token');
  }
}

async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Get user info error:', error.response?.data || error.message);
    throw new Error('Failed to get user info');
  }
}

module.exports = { 
  authMiddleware, 
  requireRole,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getUserInfo
};
