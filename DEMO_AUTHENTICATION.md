# Guide de Démonstration - Comparaison Keycloak vs Auth0

Ce guide vous permet de tester et comparer les trois solutions d'authentification implémentées dans Collector-Shop.

## Solutions disponibles

1. **JWT Custom** (branche `main`) - Solution actuelle
2. **Keycloak** (branche `feature/keycloak-integration`) - Open-source, self-hosted
3. **Auth0** (branche `feature/auth0-integration`) - SaaS, cloud-managed

## Prérequis

- Docker et Docker Compose installés
- Git installé
- Ports 4004, 5173, et 8080 disponibles
- (Pour Auth0) Compte Auth0 créé et configuré

## Utilisation du script de démonstration

### Syntaxe

```bash
./scripts/switch-auth.sh [keycloak|auth0|custom]
```

### Exemples

#### Tester Keycloak

```bash
./scripts/switch-auth.sh keycloak
```

Cela va:
1. Arrêter les containers actuels
2. Basculer vers la branche `feature/keycloak-integration`
3. Démarrer Keycloak + PostgreSQL + Backend + Frontend

**Accès:**
- Keycloak Admin: http://localhost:8080 (admin/admin)
- Frontend: http://localhost:5173
- Backend: http://localhost:4004

#### Tester Auth0

```bash
./scripts/switch-auth.sh auth0
```

Cela va:
1. Arrêter les containers actuels
2. Basculer vers la branche `feature/auth0-integration`
3. Démarrer Backend + Frontend (configurés pour Auth0)

**Note:** Nécessite configuration préalable dans .env

#### Revenir à l'authentification custom

```bash
./scripts/switch-auth.sh custom
```

Cela va:
1. Arrêter les containers actuels
2. Revenir sur la branche `main`
3. Démarrer l'application avec JWT custom

## Configuration Keycloak

Après avoir lancé Keycloak, suivez ces étapes:

### 1. Se connecter à l'admin console

```
URL: http://localhost:8080
Username: admin
Password: admin
```

### 2. Créer un realm

1. Survolez "Master" en haut à gauche
2. Cliquez sur "Create Realm"
3. Name: `collector-shop`
4. Cliquez sur "Create"

### 3. Créer un client pour le backend

1. Dans le menu, allez dans "Clients"
2. Cliquez sur "Create client"
3. Remplissez:
   - Client ID: `collector-backend`
   - Client Protocol: `openid-connect`
4. Next
5. Activez:
   - Client authentication: ON
   - Authorization: OFF
   - Standard flow: ON
   - Direct access grants: ON
6. Next
7. Valid Redirect URIs: `http://localhost:4004/*`
8. Save

### 4. Créer un client pour le frontend

1. Clients → Create client
2. Remplissez:
   - Client ID: `collector-frontend`
   - Client Protocol: `openid-connect`
3. Next
4. Activez:
   - Client authentication: OFF (Public client)
   - Standard flow: ON
   - Direct access grants: OFF
5. Next
6. Valid Redirect URIs: `http://localhost:5173/*`
7. Web Origins: `http://localhost:5173`
8. Save

### 5. Créer les rôles

1. Dans le menu, allez dans "Realm roles"
2. Créez ces 3 rôles:
   - `ADMIN`
   - `SELLER`
   - `BUYER`

### 6. Créer un utilisateur test

1. Dans le menu, allez dans "Users"
2. Cliquez sur "Add user"
3. Remplissez:
   - Username: `admin@test.com`
   - Email: `admin@test.com`
   - Email verified: ON
   - First name: Admin
   - Last name: Test
4. Save
5. Onglet "Credentials" → Set password: `Test@123`
6. Temporary: OFF
7. Onglet "Role mapping" → Assign role: `ADMIN`

### 7. Tester l'authentification

1. Ouvrez http://localhost:5173
2. Connectez-vous avec `admin@test.com` / `Test@123`
3. Vous devriez être redirigé vers Keycloak puis de retour à l'application

## Configuration Auth0

### 1. Créer un tenant Auth0

1. Allez sur https://auth0.com
2. Créez un compte gratuit
3. Créez un tenant (ex: `collector-shop-demo`)

### 2. Créer une API

1. Dans le dashboard, allez dans "Applications" → "APIs"
2. Cliquez sur "Create API"
3. Remplissez:
   - Name: `Collector Shop API`
   - Identifier: `https://api.collector-shop.com`
   - Signing Algorithm: RS256
4. Create

### 3. Créer une application SPA

1. Dans "Applications", cliquez sur "Create Application"
2. Remplissez:
   - Name: `Collector Shop Frontend`
   - Type: Single Page Web Applications
3. Create
4. Dans les Settings:
   - Allowed Callback URLs: `http://localhost:5173/callback`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
   - Allowed Origins (CORS): `http://localhost:5173`
5. Save Changes

### 4. Créer une application M2M (pour le backend)

1. Applications → Create Application
2. Remplissez:
   - Name: `Collector Shop Backend`
   - Type: Machine to Machine Applications
3. Autorisez l'accès à l'API créée précédemment
4. Create

### 5. Créer les rôles

1. Dans "User Management" → "Roles", créez:
   - `ADMIN`
   - `SELLER`
   - `BUYER`

### 6. Configurer les rôles dans les tokens

1. Allez dans "Actions" → "Flows" → "Login"
2. Cliquez sur le "+" pour ajouter une Action
3. Créez une nouvelle Action "Add Roles to Token"
4. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://api.collector-shop.com';
  
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
```

5. Deploy
6. Ajoutez cette Action au flow "Login"

### 7. Configurer .env

Créez ou modifiez le fichier `.env`:

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.collector-shop.com
AUTH0_CLIENT_ID=<backend-client-id>
AUTH0_CLIENT_SECRET=<backend-client-secret>
AUTH0_FRONTEND_CLIENT_ID=<frontend-client-id>

# Autres variables
STRIPE_SECRET_KEY=your-stripe-key
JWT_SECRET=your-jwt-secret
```

### 8. Créer un utilisateur test

1. Dans "User Management" → "Users"
2. Créez un utilisateur avec email/password
3. Assignez-lui le rôle `ADMIN`

### 9. Tester l'authentification

1. Lancez `./scripts/switch-auth.sh auth0`
2. Ouvrez http://localhost:5173
3. Connectez-vous avec l'utilisateur créé
4. Vous serez redirigé vers Auth0 Universal Login puis de retour

## Scénarios de test

### Scénario 1: Inscription utilisateur

**Objectif:** Comparer l'expérience d'inscription

**JWT Custom:**
1. Cliquez sur "S'inscrire"
2. Remplissez le formulaire
3. Inscription immédiate avec validation admin

**Keycloak:**
1. Le self-registration doit être activé dans Keycloak
2. Processus personnalisable
3. Possibilité d'email verification

**Auth0:**
1. Redirection vers Universal Login
2. Interface Auth0 moderne
3. Email verification automatique

### Scénario 2: Connexion avec social login

**JWT Custom:**
- ❌ Non supporté nativement

**Keycloak:**
1. Configurer un Identity Provider (Google, Facebook, etc.)
2. Apparaît automatiquement sur la page de login
3. ✅ Supporté

**Auth0:**
1. Activer les connexions sociales dans le dashboard
2. Configuration en quelques clics
3. ✅ Supporté nativement

### Scénario 3: Multi-Factor Authentication (MFA)

**JWT Custom:**
- ❌ Non implémenté

**Keycloak:**
1. Configurer OTP dans "Authentication" → "Required Actions"
2. L'utilisateur doit scanner un QR code
3. ✅ TOTP supporté

**Auth0:**
1. Activer MFA dans "Security" → "Multi-factor Auth"
2. Options: SMS, Email, TOTP, Push
3. ✅ MFA avancé

### Scénario 4: Gestion des rôles

**JWT Custom:**
- Roles stockés en BDD
- Gestion via admin panel custom
- ✅ Flexible mais manuel

**Keycloak:**
- Realm roles + Client roles
- Mappers pour inclure dans JWT
- ✅ Très flexible

**Auth0:**
- Roles via RBAC
- Custom claims via Actions
- ✅ Flexible avec limites

### Scénario 5: Récupération de mot de passe

**JWT Custom:**
- Email envoyé avec lien
- Backend custom à implémenter
- ⚠️ Nécessite service email

**Keycloak:**
- Flow "Forgot Password" intégré
- Email templates customisables
- ✅ Inclus

**Auth0:**
- "Change Password" flow
- Email envoyé automatiquement
- ✅ Inclus et géré

### Scénario 6: Monitoring et logs

**JWT Custom:**
- Logs console backend
- Pas de dashboard
- ⚠️ À implémenter

**Keycloak:**
- Events logging
- Export vers Prometheus/Grafana
- ⚠️ Configuration nécessaire

**Auth0:**
- Dashboard avec analytics
- Logs en temps réel
- ✅ Inclus

## Métriques de comparaison

### Temps de mise en place

| Solution | Configuration initiale | Prêt à produire |
|----------|------------------------|-----------------|
| JWT Custom | 2-4 jours | 1-2 semaines |
| Keycloak | 2-4 jours | 2-4 semaines |
| Auth0 | 1-2 heures | 1-2 jours |

### Complexité (1-5, 5 = plus complexe)

| Aspect | JWT Custom | Keycloak | Auth0 |
|--------|------------|----------|-------|
| Setup | 3 | 4 | 1 |
| Configuration | 2 | 4 | 2 |
| Maintenance | 4 | 5 | 1 |
| Développement | 4 | 3 | 2 |
| Debugging | 3 | 3 | 2 |

### Fonctionnalités

| Fonctionnalité | JWT Custom | Keycloak | Auth0 |
|----------------|------------|----------|-------|
| Username/Password | ✅ | ✅ | ✅ |
| Social Login | ❌ | ✅ | ✅ |
| MFA | ❌ | ✅ TOTP | ✅ Avancé |
| Passwordless | ❌ | ⚠️ Limité | ✅ |
| SAML | ❌ | ✅ | ✅ |
| LDAP/AD | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ |
| Anomaly Detection | ❌ | ❌ | ✅ |

## Nettoyage

Pour nettoyer complètement l'environnement:

```bash
# Arrêter tous les containers
docker-compose -f docker-compose.keycloak.yml down -v
docker-compose -f docker-compose.auth0.yml down -v
docker-compose down -v

# Supprimer les volumes Docker
docker volume prune -f

# Revenir sur main
git checkout main
```

## Troubleshooting

### Keycloak ne démarre pas

**Problème:** Container Keycloak en erreur

**Solutions:**
```bash
# Vérifier les logs
docker logs keycloak

# Redémarrer avec logs
docker-compose -f docker-compose.keycloak.yml up

# Vérifier que PostgreSQL est prêt
docker logs postgres-keycloak
```

### Auth0 - Erreur CORS

**Problème:** Erreur CORS lors de l'authentification

**Solution:**
1. Vérifiez "Allowed Web Origins" dans Auth0 dashboard
2. Ajoutez `http://localhost:5173`
3. Vérifiez "Allowed Origins (CORS)"

### Ports déjà utilisés

**Problème:** Port 4004, 5173 ou 8080 déjà utilisé

**Solution:**
```bash
# Trouver le processus
lsof -i :8080

# Arrêter les containers Docker
docker stop $(docker ps -aq)
```

## Ressources supplémentaires

- **Document comparatif complet:** [COMPARAISON_KEYCLOAK_AUTH0.md](./COMPARAISON_KEYCLOAK_AUTH0.md)
- **Documentation Keycloak:** https://www.keycloak.org/documentation
- **Documentation Auth0:** https://auth0.com/docs
- **OAuth 2.0 / OIDC:** https://oauth.net/2/

## Support

Pour toute question ou problème:
1. Consultez le document de comparaison
2. Vérifiez les logs Docker
3. Consultez la documentation officielle des solutions

---

**Dernière mise à jour:** 2026-01-19  
**Version:** 1.0
