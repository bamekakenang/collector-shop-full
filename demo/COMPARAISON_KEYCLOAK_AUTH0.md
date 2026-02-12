# Comparaison des Serveurs d'Autorisation : Keycloak vs Auth0
## Contexte Collector Shop

---

## 1. Présentation des Solutions

### Keycloak (Red Hat / CNCF)
- **Type** : Open-source, auto-hébergé
- **Licence** : Apache 2.0
- **Éditeur** : Red Hat (projet CNCF)
- **Version testée** : 24.0
- **Protocoles** : OpenID Connect, SAML 2.0, OAuth 2.0
- **Déploiement** : Docker, Kubernetes, bare-metal

### Auth0 (Okta)
- **Type** : SaaS (Identity-as-a-Service)
- **Licence** : Propriétaire (free tier disponible)
- **Éditeur** : Okta (acquis en 2021)
- **Protocoles** : OpenID Connect, SAML 2.0, OAuth 2.0
- **Déploiement** : Cloud managé (AWS)

---

## 2. Comparaison Fonctionnelle

### Authentification
- **Keycloak** : Username/password, Social Login (Google, GitHub, Facebook), Kerberos, X.509 certificats, OTP
- **Auth0** : Username/password, Social Login (30+ providers), Passwordless (email/SMS), WebAuthn/FIDO2, MFA adaptatif

### Autorisation / Rôles
- **Keycloak** : Realm roles, Client roles, Groups, Fine-grained authorization (UMA), Policy-based access control
- **Auth0** : Rôles via RBAC, Permissions, Organizations (multi-tenant), Actions (pipeline post-login pour ajouter des claims custom)

### Fédération d'identité
- **Keycloak** : LDAP/Active Directory natif, Identity Brokering, SAML IdP, Social providers
- **Auth0** : Enterprise connections (AD/LDAP via agent), SAML, Social providers, Custom databases

### Personnalisation UI
- **Keycloak** : Thèmes FreeMarker entièrement personnalisables, pages login/register/reset hébergées par Keycloak
- **Auth0** : Universal Login (page hébergée), Lock widget (embarqué), New Universal Login (customisable via dashboard)

---

## 3. Comparaison Technique

### Architecture

**Keycloak :**
- Application Java (Quarkus depuis v17)
- Base de données relationnelle (PostgreSQL, MySQL, H2 en dev)
- Cache distribué via Infinispan
- Clustering horizontal natif
- Déploiement : 1 conteneur Docker (~500MB)

**Auth0 :**
- Infrastructure cloud managée par Okta
- Multi-tenant, répliqué globalement
- CDN pour les assets statiques
- API rate-limited (selon le plan)

### Performance (observée durant les tests)

**Keycloak :**
- Démarrage : ~20-30 secondes (mode dev)
- Temps de réponse token : ~50-100ms (local)
- Import realm automatique au démarrage
- Consommation mémoire : ~400-600MB

**Auth0 :**
- Démarrage : instantané (SaaS)
- Temps de réponse token : ~200-400ms (réseau)
- Configuration via dashboard ou Management API
- Consommation mémoire : 0 (côté client)

### Tokens JWT — Comparaison des Payloads

**Token Keycloak (buyer@collector.shop) :**
```
{
  "iss": "http://localhost:8180/realms/collector-shop",
  "realm_access": { "roles": ["BUYER"] },
  "realm_roles": ["BUYER"],             ← custom mapper
  "name": "Jean Acheteur",
  "email": "buyer@collector.shop",
  "email_verified": true,
  "preferred_username": "buyer@collector.shop",
  "allowed-origins": ["http://localhost:3000", ...]
}
```

**Token Auth0 (buyer@collector.shop) :**
```
{
  "iss": "https://dev-xxx.us.auth0.com/",
  "sub": "auth0|698e1f00...",
  "nickname": "buyer",
  "name": "buyer@collector.shop",
  "email": "buyer@collector.shop",
  "email_verified": false,
  "aud": "tpaSG1IW5XQc7VMaV814zEtgNlbRShSi"
}
```

**Différences clés :**
- Keycloak intègre les **rôles directement** dans le token (`realm_roles`)
- Auth0 nécessite une **Action post-login** pour ajouter des rôles custom
- Keycloak gère les **allowed-origins** (CORS) dans le token
- Auth0 utilise un identifiant opaque (`sub: "auth0|..."`)

---

## 4. Comparaison Opérationnelle

### Mise en place

**Keycloak — Temps estimé : 30-45 min**
1. Déployer le conteneur Docker (2 min)
2. Créer le realm (5 min)
3. Configurer le client OIDC (5 min)
4. Créer les rôles (5 min)
5. Créer les utilisateurs (5 min)
6. Configurer les protocol mappers pour les rôles dans le token (10 min)
7. Tester (5 min)

> Note : automatisable via `realm-export.json` (import au démarrage)

**Auth0 — Temps estimé : 10-15 min**
1. Créer un compte (2 min)
2. Créer l'application (2 min)
3. Configurer les URLs de callback (2 min)
4. Activer le Password grant (1 min)
5. Configurer le Default Directory (1 min)
6. Créer les utilisateurs (3 min)
7. Tester (2 min)

### Maintenance

**Keycloak :**
- Mises à jour manuelles (nouvelle image Docker)
- Sauvegarde base de données à gérer
- Monitoring à mettre en place (health checks, métriques)
- Gestion des certificats TLS
- Scaling horizontal à configurer

**Auth0 :**
- Mises à jour automatiques (SaaS)
- Sauvegardes gérées par Okta
- Monitoring intégré (logs, anomaly detection)
- TLS géré automatiquement
- Scaling transparent

---

## 5. Forces et Faiblesses

### Keycloak

**Forces :**
- ✅ Gratuit et open-source (Apache 2.0)
- ✅ Souveraineté complète des données
- ✅ Conformité RGPD (données hébergées où on veut)
- ✅ Aucune limite d'utilisateurs ni de connexions
- ✅ Personnalisation totale (thèmes, flows, extensions SPI)
- ✅ Intégration native LDAP/Active Directory/Kerberos
- ✅ Rôles dans le token JWT sans configuration supplémentaire
- ✅ Communauté active (projet CNCF)

**Faiblesses :**
- ❌ Infrastructure à provisionner et maintenir
- ❌ Démarrage lent (~30-60s en dev, ~15s en prod optimisé)
- ❌ Complexité d'administration (beaucoup d'options)
- ❌ Consommation mémoire élevée (~400-600MB)
- ❌ Pas de support commercial sans Red Hat SSO (payant)
- ❌ Documentation parfois lacunaire pour les cas avancés

**Limites :**
- Nécessite des compétences DevOps pour le déploiement en production
- Le clustering requiert une base de données externe (PostgreSQL)
- Les mises à jour majeures peuvent casser la compatibilité

### Auth0

**Forces :**
- ✅ Setup en 5-10 minutes
- ✅ Zéro infrastructure à gérer
- ✅ SLA 99.99% (plan Enterprise)
- ✅ SDKs officiels pour tous les langages/frameworks
- ✅ MFA / Passwordless / WebAuthn out-of-the-box
- ✅ Anomaly detection et brute-force protection intégrés
- ✅ Dashboard moderne et intuitif
- ✅ Actions pipeline (logique post-login extensible)

**Faiblesses :**
- ❌ Coût par utilisateur actif mensuel (MAU)
- ❌ Vendor lock-in (migration complexe)
- ❌ Données hébergées chez Okta (USA par défaut)
- ❌ Limites du free tier : 7 500 MAU, 2 Social connections
- ❌ Rate limiting sur les API (selon le plan)
- ❌ Les rôles ne sont pas dans le token par défaut (Action nécessaire)

**Limites :**
- Le free tier ne convient pas pour la production à grande échelle
- La conformité RGPD nécessite le plan Enterprise (données en EU)
- Personnalisation UI plus limitée que Keycloak

---

## 6. Coûts

### Keycloak
- **Licence** : 0€ (open-source)
- **Infrastructure** : coût du serveur/VM/conteneur
  - Exemple : VM Azure B2s = ~30€/mois
  - Exemple : Pod K8s = dépend du cluster existant
- **Maintenance** : temps équipe DevOps

### Auth0
- **Free** : 0€ (7 500 MAU, fonctionnalités limitées)
- **Essential** : à partir de 35$/mois (jusqu'à 10K MAU)
- **Professional** : à partir de 240$/mois (jusqu'à 10K MAU)
- **Enterprise** : sur devis (données EU, SLA, support)

### Projection pour Collector Shop
- **0-7 500 utilisateurs** : Auth0 Free = 0€ vs Keycloak = ~30€/mois (infra)
- **10 000 utilisateurs** : Auth0 Essential = ~35$/mois vs Keycloak = ~30€/mois
- **50 000 utilisateurs** : Auth0 = ~240$/mois+ vs Keycloak = ~30€/mois
- **100 000+ utilisateurs** : Auth0 = sur devis vs Keycloak = ~30-60€/mois (scaling)

---

## 7. Recommandation pour Collector Shop

### Court terme (prototype / MVP)
**→ Auth0** : mise en place rapide, free tier suffisant pour le développement et les premiers utilisateurs. Permet à l'équipe de se concentrer sur les fonctionnalités métier.

### Moyen terme (production < 50K users)
**→ Auth0 ou Keycloak** : les deux sont viables. Auth0 si l'équipe est petite, Keycloak si l'équipe dispose de compétences DevOps.

### Long terme (production > 50K users ou contraintes RGPD)
**→ Keycloak** : coût maîtrisé, souveraineté des données, pas de dépendance fournisseur. Nécessite une équipe DevOps pour la maintenance.

### Critère décisif
Le choix final dépend de **deux facteurs** :
1. **Budget** : Auth0 devient cher à grande échelle
2. **Souveraineté** : si les données doivent rester en Europe → Keycloak
