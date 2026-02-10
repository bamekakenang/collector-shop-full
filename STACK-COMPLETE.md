# Architecture Complète - Collector Shop

## 📋 Vue d'Ensemble

**Collector Shop** est une plateforme e-commerce complète pour la vente d'objets de collection, déployée sur **Kubernetes** avec une architecture microservices moderne incluant messaging asynchrone, CI/CD automatisé, et authentification JWT.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  DÉVELOPPEUR                                         │
│                                                                                      │
│  • Développe en local (MacOS)                                                       │
│  • git push → déclenche CI/CD automatique                                          │
│  • Accès cluster via kubectl                                                        │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                                   │ git push
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB (SCM + CI/CD)                                    │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  REPOSITORY: github.com/bamekakenang/collector-shop-full                   │   │
│  │                                                                              │   │
│  │  • Source code (backend, frontend)                                          │   │
│  │  • Kubernetes manifests (k8s/)                                              │   │
│  │  • CI/CD pipelines (.github/workflows/)                                     │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  GITHUB ACTIONS (CI/CD Pipeline)                                            │   │
│  │                                                                              │   │
│  │  Workflow: .github/workflows/ci.yml                                         │   │
│  │                                                                              │   │
│  │  1️⃣  Dependency Review (PRs only)                                          │   │
│  │  2️⃣  Backend Tests (npm test)                                              │   │
│  │  3️⃣  Frontend Tests (typecheck + build)                                    │   │
│  │  4️⃣  Build Docker images                                                   │   │
│  │  5️⃣  Security scan (Trivy)                                                 │   │
│  │  6️⃣  Push to GHCR (ghcr.io)                                                │   │
│  │  7️⃣  Update K8s manifests (GitOps)                                         │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  GITHUB CONTAINER REGISTRY (ghcr.io)                                        │   │
│  │                                                                              │   │
│  │  Images:                                                                     │   │
│  │  • ghcr.io/bamekakenang/collector-shop-full-backend:{SHA}                  │   │
│  │  • ghcr.io/bamekakenang/collector-shop-full-frontend:{SHA}                 │   │
│  │                                                                              │   │
│  │  Tags: Commit SHA (immutable)                                               │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                                   │ kubectl apply / docker pull
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER (Minikube)                                │
│                         Namespace: collector-shop                                    │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │                          INGRESS NGINX                                      │   │
│  │                     collector-shop.local                                    │   │
│  │                     (Point d'entrée HTTP)                                   │   │
│  └──────────────────────────────┬──────────────────────────────────────────────┘   │
│                                 │                                                    │
│                                 ▼                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (React SPA)                                                       │   │
│  │  ────────────────────────                                                   │   │
│  │  Pod: collector-frontend-xxx                                                │   │
│  │  Image: ghcr.io/.../frontend:{SHA}                                          │   │
│  │  Service: NodePort 31425                                                    │   │
│  │                                                                              │   │
│  │  Container:                                                                  │   │
│  │    • Nginx (Alpine) - Reverse Proxy                                         │   │
│  │    • React 18 + TypeScript                                                  │   │
│  │    • Vite (build tool)                                                      │   │
│  │    • Tailwind CSS                                                           │   │
│  │                                                                              │   │
│  │  Nginx Config:                                                              │   │
│  │    location / → Serve React SPA (static files)                             │   │
│  │    location /api/ → proxy_pass http://collector-backend:4003               │   │
│  │                                                                              │   │
│  │  Resources: 50m-300m CPU, 64Mi-256Mi RAM                                    │   │
│  └──────────────────────────────┬──────────────────────────────────────────────┘   │
│                                 │ HTTP /api/*                                        │
│                                 ▼                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  BACKEND (Node.js API)                                                      │   │
│  │  ──────────────────────                                                     │   │
│  │  Pod: collector-backend-xxx                                                 │   │
│  │  Image: collector-backend:latest (local) ou ghcr.io/.../backend:{SHA}      │   │
│  │  Service: NodePort 30003                                                    │   │
│  │                                                                              │   │
│  │  Container:                                                                  │   │
│  │    • Node.js 20 (Alpine)                                                    │   │
│  │    • Express.js 4.21.2                                                      │   │
│  │    • Prisma ORM 6.2.1                                                       │   │
│  │    • JWT Authentication                                                     │   │
│  │    • RabbitMQ Client (amqplib)                                              │   │
│  │    • Stripe Integration                                                     │   │
│  │                                                                              │   │
│  │  Modules:                                                                    │   │
│  │    - src/server.js: API REST                                                │   │
│  │    - src/auth.js: JWT signing/verification                                  │   │
│  │    - src/prisma.js: Database client                                         │   │
│  │    - src/services/rabbitmq.js: Message broker                               │   │
│  │                                                                              │   │
│  │  Health: /api/health                                                        │   │
│  │  Probes: Readiness 30s, Liveness 60s                                        │   │
│  │  Resources: 100m-1000m CPU, 256Mi-1Gi RAM                                   │   │
│  └───┬────────────────┬───────────────────┬─────────────────────────────────────┘   │
│      │                │                   │                                         │
│      │                │                   │                                         │
│      ▼                ▼                   ▼                                         │
│  ┌─────────┐   ┌───────────────┐   ┌──────────────┐                               │
│  │ SQLite  │   │   RabbitMQ    │   │    Stripe    │                               │
│  │   DB    │   │   Message     │   │   Payment    │                               │
│  │         │   │    Broker     │   │     API      │                               │
│  │ File:   │   │               │   │  (External)  │                               │
│  │ dev.db  │   │  Pod: xxx     │   │              │                               │
│  │         │   │  Image:       │   │   HTTPS      │                               │
│  │ Prisma  │   │  rabbitmq:    │   │   Checkout   │                               │
│  │  ORM    │   │  3.13-alpine  │   │   Sessions   │                               │
│  │         │   │               │   │              │                               │
│  │ Volume: │   │  Service:     │   └──────────────┘                               │
│  │ EmptyDir│   │  NodePort     │                                                   │
│  │         │   │  30672/31672  │                                                   │
│  │         │   │               │                                                   │
│  │         │   │  AMQP: 5672   │                                                   │
│  │         │   │  Mgmt: 15672  │                                                   │
│  │         │   │               │                                                   │
│  │         │   │  Exchange:    │                                                   │
│  │         │   │  collector-   │                                                   │
│  │         │   │  shop (topic) │                                                   │
│  │         │   │               │                                                   │
│  │         │   │  Queue:       │                                                   │
│  │         │   │  orders       │                                                   │
│  │         │   │  (order.*)    │                                                   │
│  │         │   │               │                                                   │
│  │         │   │  Events:      │                                                   │
│  │         │   │  • order.     │                                                   │
│  │         │   │    created    │                                                   │
│  │         │   │  • order.     │                                                   │
│  │         │   │    completed  │                                                   │
│  │         │   │               │                                                   │
│  │         │   │  Resources:   │                                                   │
│  │         │   │  100m-500m    │                                                   │
│  │         │   │  256Mi-512Mi  │                                                   │
│  └─────────┘   └───────────────┘                                                   │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │  KUBERNETES CONFIGURATION                                                   │   │
│  │                                                                              │   │
│  │  ConfigMap: collector-config                                                │   │
│  │    • DATABASE_URL                                                           │   │
│  │    • FRONTEND_URL                                                           │   │
│  │    • RABBITMQ_URL                                                           │   │
│  │                                                                              │   │
│  │  Secrets: collector-secrets                                                 │   │
│  │    • JWT_SECRET (base64)                                                    │   │
│  │    • STRIPE_SECRET_KEY (base64)                                             │   │
│  │                                                                              │   │
│  │  NetworkPolicy: backend-restrict-ingress                                    │   │
│  │    • Backend accessible uniquement depuis frontend + RabbitMQ               │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Stack Technique Complète

### **Frontend**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **React** | 18.3.1 | Framework UI |
| **TypeScript** | 5.7.2 | Typage statique |
| **Vite** | 6.0.5 | Build tool & dev server |
| **React Router DOM** | 7.1.3 | Routing SPA |
| **Tailwind CSS** | 3.4.17 | Framework CSS utility-first |
| **Lucide React** | 0.468.0 | Icônes |
| **Fetch API** | Native | Appels HTTP |
| **Nginx** | Alpine | Reverse proxy & serveur web |

**Dépendances de développement :**
- `eslint` 9.17.0 - Linting
- `@types/react` 18.3.18 - Types React
- `postcss` 8.4.49 - Traitement CSS
- `autoprefixer` 10.4.20 - Compatibilité navigateurs

**Fichiers clés :**
```
frontend/
├── src/
│   ├── main.tsx                 # Point d'entrée
│   ├── App.tsx                  # Composant racine
│   ├── api/client.ts            # Client HTTP API
│   ├── components/              # Composants React
│   └── lib/                     # Utilitaires
├── nginx.conf                   # Config Nginx
├── Dockerfile                   # Multi-stage build
├── package.json
└── vite.config.ts
```

---

### **Backend**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | 20 (Alpine) | Runtime JavaScript |
| **Express** | 4.21.2 | Framework web |
| **Prisma** | 6.2.1 | ORM (Object-Relational Mapping) |
| **SQLite** | 3.x | Base de données relationnelle |
| **jsonwebtoken** | 9.0.2 | Génération/vérification JWT |
| **bcryptjs** | 2.4.3 | Hash mots de passe |
| **multer** | 1.4.5-lts.1 | Upload fichiers |
| **amqplib** | 0.10.5 | Client RabbitMQ |
| **stripe** | 17.5.0 | API paiements |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |
| **dotenv** | 16.4.7 | Variables d'environnement |
| **axios** | 1.7.9 | HTTP client |
| **jwk-to-pem** | 2.0.6 | Conversion clés JWT |

**Dépendances de développement :**
- `jest` 29.7.0 - Tests unitaires/intégration
- `supertest` 7.0.0 - Tests API REST
- `nodemon` 3.1.9 - Hot reload

**Fichiers clés :**
```
backend/
├── src/
│   ├── server.js               # API REST Express
│   ├── auth.js                 # Auth JWT + middleware
│   ├── prisma.js               # Prisma client
│   └── services/
│       └── rabbitmq.js         # Message broker
├── prisma/
│   ├── schema.prisma           # Schéma base de données
│   └── migrations/             # Migrations SQL
├── tests/
│   ├── unit/                   # Tests unitaires
│   └── integration/            # Tests d'intégration
├── Dockerfile
└── package.json
```

---

### **Message Broker**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **RabbitMQ** | 3.13-alpine | Message broker AMQP |
| **AMQP** | 0.9.1 | Protocole messaging |

**Configuration :**
- Exchange: `collector-shop` (type: topic)
- Queue: `orders` (binding: `order.*`)
- Credentials: `admin` / `admin123`
- Ports: 5672 (AMQP), 15672 (Management UI)

**Events RabbitMQ :**
```javascript
// Producer (backend)
rabbitmq.publish('order.created', {
  orderId: '...',
  productId: '...',
  buyerId: '...',
  totalPrice: 465
});

// Consumer (backend)
rabbitmq.consumeOrders(async (orderData) => {
  // Traitement asynchrone:
  // - Update order status
  // - Send email notification
  // - Update inventory
});
```

---

### **Base de Données**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **SQLite** | 3.x | SGBD relationnel file-based |
| **Prisma** | 6.2.1 | ORM + migrations |

**Schéma :**
```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String?
  name     String
  role     String   // BUYER | SELLER | ADMIN
  active   Boolean  @default(false)
  address  String?
  phone    String?
  gender   String?
  orders   Order[]
  sellerRequest SellerRequest?
}

model Product {
  id            String
  title         String
  description   String
  price         Float
  shipping      Float
  image         String
  images        Json?
  categoryId    String
  sellerId      String
  sellerName    String
  status        String   // available | pending | sold
  createdAt     DateTime
  category      Category @relation(...)
  orders        Order[]
}

model Order {
  id         String   @id @default(cuid())
  productId  String
  buyerId    String
  totalPrice Float
  status     String   // pending | processing | completed
  createdAt  DateTime @default(now())
  product    Product  @relation(...)
  buyer      User     @relation(...)
}

model Category {
  id       String
  name     String
  products Product[]
}

model SellerRequest {
  id        String   @id @default(cuid())
  userId    String   @unique
  status    String   // pending | approved | rejected
  message   String?
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

---

### **Orchestration & Infrastructure**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Kubernetes** | 1.32.0 | Orchestration containers |
| **Minikube** | 1.35.0 | Cluster Kubernetes local |
| **Docker** | 27.4.1 | Containerisation |
| **kubectl** | 1.32+ | CLI Kubernetes |
| **Nginx Ingress** | 1.11.3 | Ingress controller |

**Ressources Kubernetes :**
```
Namespace: collector-shop

Deployments:
  • collector-backend (1 replica)
  • collector-frontend (1 replica)
  • rabbitmq (1 replica)

Services:
  • collector-backend (NodePort 30003)
  • collector-frontend (NodePort 31425)
  • rabbitmq (NodePort 30672/31672)

ConfigMaps:
  • collector-config

Secrets:
  • collector-secrets

Ingress:
  • collector-shop-ingress

NetworkPolicies:
  • backend-restrict-ingress
```

---

### **CI/CD**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **GitHub Actions** | - | Plateforme CI/CD |
| **Trivy** | 0.28.0 | Scan vulnérabilités images |
| **Docker Buildx** | - | Build multi-plateformes |
| **GitHub Container Registry** | - | Registry Docker privé |

**Pipeline :**
```yaml
Triggers:
  • push to main
  • pull_request to main

Jobs:
  1. dependency-review (PRs only)
  2. backend tests (npm test)
  3. frontend tests (typecheck + build)
  4. build-and-push-images:
     - Build Docker images
     - Scan with Trivy
     - Push to ghcr.io
     - Update K8s manifests (GitOps)
```

**Actions utilisées :**
- `actions/checkout@v4` - Clone repository
- `actions/setup-node@v4` - Setup Node.js
- `docker/login-action@v3` - Login GHCR
- `aquasecurity/trivy-action@0.28.0` - Security scan
- `actions/dependency-review-action@v4` - Dependency scan

---

### **Paiement**

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Stripe** | 17.5.0 (SDK) | Processeur de paiements |

**Flow :**
```
1. Frontend → POST /api/checkout/session
2. Backend → stripe.checkout.sessions.create()
3. Backend ← session.url
4. Frontend ← Redirect vers Stripe Checkout
5. User → Paiement sur Stripe
6. Stripe → Redirect vers success_url ou cancel_url
```

---

### **Authentification & Sécurité**

| Technologie | Implémentation |
|-------------|----------------|
| **JWT** | jsonwebtoken 9.0.2 |
| **Hashing** | bcryptjs (10 rounds) |
| **CORS** | cors middleware |
| **RBAC** | Roles: BUYER, SELLER, ADMIN |
| **NetworkPolicy** | Backend isolation |
| **Secrets** | Kubernetes Secrets (base64) |

**JWT Structure :**
```javascript
{
  id: 'user-id',
  email: 'user@example.com',
  role: 'BUYER',
  iat: 1234567890,
  exp: 1234567890 + 3600 * 24 * 7  // 7 days
}
```

**Middleware Auth :**
```javascript
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
}
```

---

### **Monitoring & Observabilité**

| Outil | Usage |
|-------|-------|
| **kubectl logs** | Logs pods |
| **kubectl describe** | Debug pods/services |
| **RabbitMQ Management UI** | Monitoring queues/exchanges |
| **Kubernetes Events** | Événements cluster |
| **Health checks** | Readiness/Liveness probes |

**Health Endpoint :**
```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

---

## 📊 Flux de Données Complets

### **1. Inscription Utilisateur**
```
Frontend → POST /api/auth/register
  {email, password, name, role}
    ↓
Backend → bcrypt.hash(password)
    ↓
Backend → prisma.user.create({...})
    ↓
Backend → SellerRequest (if role=SELLER)
    ↓
Backend ← {user, message: "En attente validation"}
    ↓
Frontend ← 201 Created
```

### **2. Connexion**
```
Frontend → POST /api/auth/login
  {email, password}
    ↓
Backend → prisma.user.findUnique({email})
    ↓
Backend → bcrypt.compare(password, hash)
    ↓
Backend → jwt.sign({id, email, role})
    ↓
Backend ← {token, user}
    ↓
Frontend ← 200 OK
Frontend → Store token in localStorage
```

### **3. Création Produit**
```
Frontend → POST /api/products
  Headers: {Authorization: Bearer {token}}
  Body: {title, description, price, ...}
    ↓
Backend → authMiddleware (verify token)
    ↓
Backend → requireRole('SELLER', 'ADMIN')
    ↓
Backend → prisma.product.create({status: 'pending'})
    ↓
Backend ← {product}
    ↓
Frontend ← 201 Created
```

### **4. Commande + RabbitMQ**
```
Frontend → POST /api/orders
  {productId, quantity}
    ↓
Backend → authMiddleware
    ↓
Backend → prisma.product.findUnique()
    ↓
Backend → prisma.order.create({status: 'pending'})
    ↓
Backend → rabbitmq.publish('order.created', {
    orderId, productId, buyerId, totalPrice
  })
    ↓
RabbitMQ → Exchange 'collector-shop'
    ↓
RabbitMQ → Queue 'orders' (binding: order.*)
    ↓
Backend Consumer ← rabbitmq.consumeOrders()
    ↓
Backend → prisma.order.update({status: 'processing'})
    ↓
Backend → [Future: Send email, update stock]
    ↓
Frontend ← 201 Created {order}
```

### **5. Paiement Stripe**
```
Frontend → POST /api/checkout/session
  {productId, quantity}
    ↓
Backend → prisma.product.findUnique()
    ↓
Backend → stripe.checkout.sessions.create({
    line_items: [{...}],
    success_url: "...",
    cancel_url: "..."
  })
    ↓
Stripe ← Create session
    ↓
Backend ← {session.url}
    ↓
Frontend ← {url: "https://checkout.stripe.com/..."}
    ↓
Frontend → window.location.href = url
    ↓
User → Paiement sur Stripe
    ↓
Stripe → Redirect success_url ou cancel_url
```

### **6. Admin : Validation Vendeur**
```
Frontend → POST /api/admin/seller-requests/{id}/approve
  Headers: {Authorization: Bearer {admin-token}}
    ↓
Backend → authMiddleware
    ↓
Backend → requireRole('ADMIN')
    ↓
Backend → prisma.sellerRequest.update({status: 'approved'})
    ↓
Backend → prisma.user.update({role: 'SELLER'})
    ↓
Frontend ← 200 OK
```

---

## 🔐 Sécurité

### **Authentification**
- ✅ JWT avec secret (HS256)
- ✅ Tokens expiration 7 jours
- ✅ Passwords bcrypt (10 rounds)
- ✅ Comptes inactifs par défaut

### **Autorisation**
- ✅ RBAC: BUYER, SELLER, ADMIN
- ✅ Middleware requireRole
- ✅ Routes protégées par authMiddleware

### **Network**
- ✅ CORS configuré (FRONTEND_URL uniquement)
- ✅ NetworkPolicy (backend isolé)
- ✅ Services internes ClusterIP

### **Secrets**
- ✅ Kubernetes Secrets (base64)
- ⚠️ Pas de chiffrement au repos (Minikube)
- 🔄 TODO: Sealed Secrets ou Vault

### **Vulnérabilités**
- ✅ Trivy scan images (CI/CD)
- ✅ npm audit (CI/CD)
- ✅ Dependency Review (PRs)

---

## 📈 Scalabilité

### **Horizontal Scaling**
```bash
# Scale backend
kubectl scale deployment collector-backend -n collector-shop --replicas=3

# Scale frontend
kubectl scale deployment collector-frontend -n collector-shop --replicas=2
```

### **Limitations Actuelles**
- ❌ **SQLite** : File-based, non-partagée entre pods
- ❌ **EmptyDir** : Données perdues au redémarrage
- ❌ **RabbitMQ single node** : Pas de HA

### **Recommandations Production**
1. **PostgreSQL** avec PersistentVolume
2. **Redis** pour cache/sessions
3. **RabbitMQ** cluster (3 nodes + StatefulSet)
4. **PersistentVolumeClaims** pour uploads
5. **HPA** (Horizontal Pod Autoscaler)
6. **Prometheus + Grafana** monitoring
7. **Cert-manager** pour HTTPS
8. **ArgoCD** pour GitOps
9. **Vault** pour secrets
10. **ELK/Loki** pour logs centralisés

---

## 🚀 Commandes Utiles

### **Développement Local**
```bash
# Backend
cd backend
npm install
npx prisma generate
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### **Kubernetes**
```bash
# Démarrer cluster
minikube start

# Deploy application
kubectl apply -f k8s/

# Accès services
kubectl port-forward -n collector-shop svc/collector-frontend 8080:80
kubectl port-forward -n collector-shop svc/rabbitmq 15672:15672

# Logs
kubectl logs -n collector-shop deployment/collector-backend -f
kubectl logs -n collector-shop deployment/rabbitmq -f

# Status
kubectl get all -n collector-shop
kubectl describe pod <pod-name> -n collector-shop
```

### **Docker**
```bash
# Build local
docker build -t collector-backend:dev backend/
docker build -t collector-frontend:dev frontend/

# Build dans Minikube
eval $(minikube docker-env)
docker build -t collector-backend:latest backend/
```

### **CI/CD**
```bash
# Trigger pipeline
git push origin main

# View runs
gh run list

# View logs
gh run view <run-id> --log
```

---

## 📚 Documentation

- **ARCHITECTURE.md** : Architecture technique détaillée
- **CICD-ARCHITECTURE.md** : Pipeline CI/CD complet
- **README.md** : Getting started
- **backend/README.md** : Documentation backend
- **frontend/README.md** : Documentation frontend

---

## 🔢 Métriques

### **Code**
- **Backend** : ~700 lignes (TypeScript/JavaScript)
- **Frontend** : ~2000 lignes (TypeScript/TSX)
- **K8s manifests** : ~500 lignes (YAML)
- **Tests** : 5 unit tests + intégration

### **Dépendances**
- **Backend** : 18 packages (prod), 5 (dev)
- **Frontend** : 6 packages (prod), 10 (dev)

### **Images Docker**
- **Backend** : ~540 MB
- **Frontend** : ~50 MB (Nginx Alpine)
- **RabbitMQ** : ~200 MB

### **Ressources Kubernetes**
- **Backend** : 100m-1000m CPU, 256Mi-1Gi RAM
- **Frontend** : 50m-300m CPU, 64Mi-256Mi RAM
- **RabbitMQ** : 100m-500m CPU, 256Mi-512Mi RAM

---

**Architecture validée et opérationnelle - Février 2026**
