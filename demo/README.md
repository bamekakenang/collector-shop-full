# Démo Comparative : Keycloak vs Auth0

## Objectif
Démontrer le fonctionnement de deux serveurs d'autorisation (Identity Provider) 
pour l'application Collector Shop, en comparant une solution **self-hosted** (Keycloak) 
et une solution **SaaS** (Auth0).

---

## 🔑 Démo 1 : Keycloak (Self-Hosted)

### Lancement (2 commandes)

```bash
cd demo/keycloak
docker compose up -d
```

> ⏳ Premier démarrage : ~30-60s (téléchargement image + init)

### Test automatisé

```bash
bash test-keycloak.sh
```

Ce script :
1. Attend que Keycloak soit prêt
2. Authentifie 3 utilisateurs (BUYER, SELLER, ADMIN) via Resource Owner Password Grant
3. Décode les tokens JWT pour montrer les rôles
4. Teste un mauvais mot de passe (rejet attendu)
5. Affiche l'endpoint OpenID Connect Discovery

### Points à montrer en démo
- **Console admin** : http://localhost:8080/admin (login: admin/admin)
  - Realm "collector-shop" pré-configuré
  - 3 utilisateurs avec rôles (BUYER, SELLER, ADMIN)
  - Client OIDC "collector-shop-app"
- **Tokens JWT** : contiennent les rôles dans le payload
- **Auto-hébergé** : tourne en local via Docker, données souveraines

### Arrêt

```bash
docker compose down
```

---

## 🔐 Démo 2 : Auth0 (SaaS)

### Prérequis : Configuration Auth0 (~5 min)

1. Créer un compte gratuit sur https://auth0.com
2. **Applications > Create Application**
   - Name : `Collector Shop`
   - Type : `Regular Web Application`
3. Dans **Settings** :
   - Copier le **Domain**, **Client ID**, **Client Secret**
   - Allowed Callback URLs : `http://localhost:3000/callback`
   - Allowed Logout URLs : `http://localhost:3000`
4. Dans **Settings > Advanced > Grant Types** :
   - Cocher `Password` (nécessaire pour le test en ligne de commande)
5. **User Management > Users > Create User** :
   - `buyer@collector.shop` / `Test1234!`
   - `admin@collector.shop` / `Test1234!`

### Test automatisé

```bash
export AUTH0_DOMAIN=votre-tenant.auth0.com
export AUTH0_CLIENT_ID=votre_client_id
export AUTH0_CLIENT_SECRET=votre_client_secret

cd demo/auth0
bash test-auth0.sh
```

### Points à montrer en démo
- **Dashboard Auth0** : https://manage.auth0.com
  - Setup en 5 min vs ~30 min pour Keycloak
  - Interface moderne, UX soignée
- **SaaS** : aucune infrastructure à gérer
- **Tokens JWT** : même standard OIDC, format similaire à Keycloak

---

## ⚖️ Tableau Comparatif (pour la soutenance)

### Keycloak
- ✅ Open-source, gratuit
- ✅ Auto-hébergé → souveraineté des données (RGPD)
- ✅ Pas de limite d'utilisateurs
- ✅ Personnalisation totale (thèmes, flows)
- ✅ Support LDAP/AD/Kerberos
- ❌ Infrastructure Docker/K8s à maintenir
- ❌ Démarrage lent (~30-60s)
- ❌ Mises à jour manuelles
- ⚠️ Complexité d'administration

### Auth0
- ✅ SaaS, zéro infrastructure
- ✅ Setup en 5 minutes
- ✅ SLA 99.99%, haute disponibilité
- ✅ SDKs pour tous les langages
- ✅ MFA / Passwordless out-of-the-box
- ❌ Coût par utilisateur actif (MAU)
- ❌ Vendor lock-in (Okta)
- ❌ Données hébergées aux USA
- ⚠️ Limites du free tier (7500 MAU)

### Recommandation pour Collector Shop
- **Phase prototype/démarrage** → Auth0 (rapidité, free tier suffisant)
- **Phase production >50K users** → Keycloak (coût, souveraineté)
- **Contexte RGPD strict** → Keycloak (données en Europe)

---

## Scénario de démo suggéré (~5 min)

1. **Keycloak** (~2.5 min)
   - Lancer `docker compose up -d`
   - Montrer la console admin (realm, users, roles)
   - Exécuter `test-keycloak.sh` → tokens JWT avec rôles
   - Souligner : auto-hébergé, RGPD, gratuit

2. **Auth0** (~2.5 min)
   - Montrer le dashboard Auth0 (application, users)
   - Exécuter `test-auth0.sh` → tokens JWT
   - Souligner : SaaS, 5 min setup, zéro maintenance
   - Comparer les tokens : même standard OIDC

3. **Conclusion** : les deux respectent OpenID Connect, 
   le choix dépend du contexte (coût, souveraineté, scalabilité)
