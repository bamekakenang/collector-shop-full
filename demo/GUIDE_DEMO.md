# Guide de Démonstration — Keycloak vs Auth0
## Pas-à-pas pour reproduire les tests

---

## Prérequis
- Docker Desktop installé et lancé
- Terminal (bash/zsh)
- Compte Auth0 gratuit (https://auth0.com)

---

## 🔑 Démo Keycloak (Self-Hosted)

### Étape 1 : Lancer Keycloak

```bash
cd demo/keycloak
docker compose up -d
```

Keycloak démarre avec :
- Realm **collector-shop** pré-configuré (via `realm-export.json`)
- 3 utilisateurs : buyer, seller, admin (mot de passe : `Test1234!`)
- 3 rôles : BUYER, SELLER, ADMIN
- Client OIDC **collector-shop-app**

> ⏳ Premier lancement : ~30s pour démarrer

### Étape 2 : Lancer les tests

```bash
bash test-keycloak.sh
```

**Résultat attendu :**
```
✅ Login réussi — buyer@collector.shop
📦 Token JWT reçu (décodage du payload) :
{
    "iss": "http://localhost:8180/realms/collector-shop",
    "realm_roles": ["BUYER"],
    "name": "Jean Acheteur",
    "email": "buyer@collector.shop"
}

✅ Login réussi — seller@collector.shop
📦 Token JWT (payload) :
{
    "realm_roles": ["SELLER"],
    "name": "Marie Vendeuse"
}

✅ Login réussi — admin@collector.shop
✅ Rejeté comme attendu : Invalid user credentials
✅ OpenID Connect Discovery : OK
```

### Étape 3 : Montrer la console admin

Ouvrir dans le navigateur : **http://localhost:8180/admin**
- Login : `admin` / `admin`

**Points à montrer :**
1. **Realm "collector-shop"** → le realm dédié à l'application
2. **Users** → 3 utilisateurs avec leurs rôles assignés
3. **Realm Roles** → BUYER, SELLER, ADMIN
4. **Clients > collector-shop-app** → configuration OIDC
   - Valid Redirect URIs
   - Web Origins (CORS)
   - Protocol Mappers (realm_roles dans le token)

### Étape 4 : Arrêter Keycloak

```bash
docker compose down
```

---

## 🔐 Démo Auth0 (SaaS)

### Étape 1 : Configuration Auth0

Si pas encore fait, configurer Auth0 :

1. **Créer un compte** sur https://auth0.com
2. **Applications > Create Application**
   - Name : `Collector Shop`
   - Type : `Regular Web Application`
3. **Settings de l'application :**
   - Allowed Callback URLs : `http://localhost:3000/callback`
   - Allowed Logout URLs : `http://localhost:3000`
   - **Save Changes**
4. **Settings > Advanced Settings > Grant Types :**
   - Cocher **Password**
   - Save
5. **Settings du tenant** (⚙️ en bas à gauche) :
   - API Authorization Settings > Default Directory : `Username-Password-Authentication`
   - Save
6. **User Management > Users > Create User :**
   - Email : `buyer@collector.shop`
   - Password : `Test1234!`
   - Connection : `Username-Password-Authentication`

### Étape 2 : Configurer les variables d'environnement

```bash
export AUTH0_DOMAIN=dev-03ducjks3gum8uui.us.auth0.com
export AUTH0_CLIENT_ID=<votre_client_id>
export AUTH0_CLIENT_SECRET=<votre_client_secret>
```

> Les valeurs se trouvent dans Applications > Collector Shop > Settings

### Étape 3 : Lancer les tests

```bash
cd demo/auth0
bash test-auth0.sh
```

**Résultat attendu :**
```
✅ Login réussi — buyer@collector.shop
📦 ID Token JWT (payload décodé) :
{
    "nickname": "buyer",
    "name": "buyer@collector.shop",
    "email": "buyer@collector.shop",
    "iss": "https://dev-xxx.us.auth0.com/"
}

✅ Rejeté comme attendu : Wrong email or password.
✅ OpenID Connect Discovery : OK
```

### Étape 4 : Montrer le dashboard Auth0

Ouvrir dans le navigateur : **https://manage.auth0.com**

**Points à montrer :**
1. **Applications > Collector Shop** → configuration de l'app
2. **User Management > Users** → utilisateur buyer@collector.shop
3. **Logs** → historique des authentifications (succès/échecs)
4. **Branding > Universal Login** → personnalisation de la page de login
5. **Security > Attack Protection** → protection brute-force automatique

---

## ⚖️ Points de Comparaison à Souligner en Démo

### 1. Mise en place
- **Keycloak** : `docker compose up -d` + realm-export.json → 2 min (automatisé)
- **Auth0** : dashboard web → 10 min (manuel)
- → Keycloak est plus rapide quand on a le fichier d'import

### 2. Tokens JWT
- **Keycloak** : rôles inclus nativement (`realm_roles: ["BUYER"]`)
- **Auth0** : pas de rôles par défaut, nécessite une Action post-login
- → Keycloak avantage pour le RBAC

### 3. Hébergement
- **Keycloak** : conteneur Docker local → données souveraines
- **Auth0** : cloud Okta (USA) → dépendance fournisseur
- → Keycloak avantage pour la souveraineté

### 4. Maintenance
- **Keycloak** : mises à jour manuelles, monitoring à mettre en place
- **Auth0** : tout est géré, SLA 99.99%
- → Auth0 avantage pour les petites équipes

### 5. Coût à l'échelle
- **Keycloak** : fixe (~30€/mois pour l'infra), illimité en utilisateurs
- **Auth0** : variable (par MAU), explose au-delà de 10K users
- → Keycloak avantage à grande échelle

---

## Scénario de Présentation Recommandé (~5 min)

**Minute 0-1 :** Introduction
- "Nous avons testé deux serveurs d'autorisation OIDC pour Collector Shop"
- Montrer le schéma d'architecture (SCHEMAS_MERMAID.md #14)

**Minute 1-3 :** Démo Keycloak
- Montrer la console admin (realm, users, roles)
- Exécuter `test-keycloak.sh`
- Souligner : rôles dans le token, auto-hébergé, RGPD

**Minute 3-5 :** Démo Auth0
- Montrer le dashboard Auth0 (app, users, logs)
- Exécuter `test-auth0.sh`
- Comparer les tokens : même standard OIDC, structure différente

**Conclusion :**
- Les deux respectent OpenID Connect
- Auth0 pour démarrer vite, Keycloak pour la production à grande échelle
- Recommandation contextualisée pour Collector Shop
