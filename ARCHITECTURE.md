# Architecture Collector Shop

## Vue d'ensemble

Collector Shop est une application e-commerce de collection d'objets déployée sur **Kubernetes (Minikube)** avec une architecture microservices et messaging asynchrone.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KUBERNETES CLUSTER                              │
│                         (Namespace: collector-shop)                      │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         INGRESS NGINX                             │  │
│  │                  (Point d'entrée HTTP externe)                    │  │
│  │                   collector-shop.local                            │  │
│  └────────────────────────┬─────────────────────────────────────────┘  │
│                           │                                              │
│  ┌────────────────────────▼─────────────────────────────────────────┐  │
│  │                      FRONTEND SERVICE                             │  │
│  │                    (NodePort: 31425)                              │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │         Frontend Pod (React + Vite + Nginx)              │   │  │
│  │  │                                                            │   │  │
│  │  │  • Interface utilisateur (SPA)                            │   │  │
│  │  │  • React 18 + TypeScript                                  │   │  │
│  │  │  • Tailwind CSS pour le style                             │   │  │
│  │  │  • React Router pour navigation                           │   │  │
│  │  │  • Nginx comme reverse proxy                              │   │  │
│  │  │                                                            │   │  │
│  │  │  Nginx Config:                                             │   │  │
│  │  │    location /api/ → proxy vers backend service           │   │  │
│  │  │    location / → serve React SPA                           │   │  │
│  │  │                                                            │   │  │
│  │  │  Resources: CPU 50m-300m, Memory 64Mi-256Mi              │   │  │
│  │  └────────────────────────┬───────────────────────────────────┘   │  │
│  └───────────────────────────┼───────────────────────────────────────┘  │
│                              │                                            │
│                              │ HTTP /api/*                                │
│                              │                                            │
│  ┌───────────────────────────▼───────────────────────────────────────┐  │
│  │                      BACKEND SERVICE                               │  │
│  │                    (NodePort: 30003)                               │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │            Backend Pod (Node.js + Express)               │    │  │
│  │  │                                                            │    │  │
│  │  │  • API REST                                                │    │  │
│  │  │  • Node.js 20 + Express                                    │    │  │
│  │  │  • Authentification JWT                                    │    │  │
│  │  │  • Bcrypt pour mots de passe                              │    │  │
│  │  │  • Multer pour upload fichiers                            │    │  │
│  │  │  • CORS configuré                                          │    │  │
│  │  │                                                            │    │  │
│  │  │  Modules:                                                  │    │  │
│  │  │    - auth.js: JWT signing/verification                    │    │  │
│  │  │    - prisma.js: Database client                           │    │  │
│  │  │    - services/rabbitmq.js: Message broker client          │    │  │
│  │  │                                                            │    │  │
│  │  │  Resources: CPU 100m-1000m, Memory 256Mi-1Gi             │    │  │
│  │  │                                                            │    │  │
│  │  │  Health checks: /api/health                               │    │  │
│  │  └────┬──────────────────┬────────────────────┬──────────────┘    │  │
│  └───────┼──────────────────┼────────────────────┼───────────────────┘  │
│          │                  │                    │                       │
│          │                  │                    │                       │
│          ▼                  ▼                    ▼                       │
│    ┌─────────┐      ┌──────────────┐    ┌─────────────┐               │
│    │ SQLite  │      │  RabbitMQ    │    │   Stripe    │               │
│    │   DB    │      │   Service    │    │  (Externe)  │               │
│    │         │      │              │    │             │               │
│    │ Prisma  │      │ Port: 5672   │    │  Paiement   │               │
│    │  ORM    │      │ Mgmt: 15672  │    │   API       │               │
│    └─────────┘      └──────┬───────┘    └─────────────┘               │
│                             │                                            │
│                             │                                            │
│                    ┌────────▼──────────┐                                │
│                    │  RabbitMQ Pod     │                                │
│                    │  (Alpine Linux)   │                                │
│                    │                   │                                │
│                    │  Exchange: topic  │                                │
│                    │  Name: collector  │                                │
│                    │        -shop      │                                │
│                    │                   │                                │
│                    │  Queue: orders    │                                │
│                    │  Binding: order.* │                                │
│                    │                   │                                │
│                    │  Credentials:     │                                │
│                    │  admin/admin123   │                                │
│                    │                   │                                │
│                    │  Resources:       │                                │
│                    │  CPU 100m-500m    │                                │
│                    │  Mem 256Mi-512Mi  │                                │
│                    └───────────────────┘                                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Stack Technique

### Frontend
- **Framework**: React 18.3.1 avec TypeScript
- **Build Tool**: Vite 6.0.5
- **Style**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 7.1.3
- **Icons**: Lucide React 0.468.0
- **HTTP**: Fetch API native
- **Serveur**: Nginx (Alpine) comme reverse proxy
- **Container**: Docker image multi-stage build

### Backend
- **Runtime**: Node.js 20 (Alpine)
- **Framework**: Express 4.21.2
- **Database**: SQLite avec Prisma ORM 6.2.1
- **Auth**: JWT (jsonwebtoken 9.0.2) + Bcrypt 2.4.3
- **Upload**: Multer 1.4.5-lts.1
- **Messaging**: RabbitMQ via amqplib 0.10.5
- **Payment**: Stripe 17.5.0
- **CORS**: cors 2.8.5

### Message Broker
- **Type**: RabbitMQ 3.13-alpine
- **Exchange**: Topic exchange `collector-shop`
- **Queues**: 
  - `orders` (binding: `order.*`)
- **Protocole**: AMQP
- **Management UI**: Port 15672

### Infrastructure
- **Orchestration**: Kubernetes (Minikube)
- **Namespace**: collector-shop
- **Ingress**: Nginx Ingress Controller
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **CI/CD**: GitHub Actions

## Architecture de Communication

### 1. Flux Client → Backend

```
Client Browser
    │
    │ HTTP/HTTPS
    │
    ▼
Ingress (collector-shop.local)
    │
    │ Route /
    │
    ▼
Frontend Service (NodePort 31425)
    │
    ▼
Frontend Pod (Nginx)
    │
    │ Location / → Serve SPA
    │ Location /api/ → Proxy
    │
    ├─→ Serve React App (static files)
    │
    └─→ Proxy /api/* requests
        │
        │ HTTP internal
        │
        ▼
Backend Service (ClusterIP)
    │
    ▼
Backend Pod (Express API)
```

### 2. Flux Backend → Database

```
Backend Pod
    │
    │ Prisma Client
    │
    ▼
SQLite Database (dev.db)
    │
    └─ File system: /app/dev.db
       EmptyDir volume (non-persistant)
```

**Schéma de données** :
- **User**: id, email, password, role (BUYER/SELLER/ADMIN), active
- **Product**: id, title, description, price, status, categoryId, sellerId
- **Order**: id, productId, buyerId, totalPrice, status
- **Category**: id, name
- **SellerRequest**: id, userId, status, message

### 3. Flux Backend → RabbitMQ (Messaging Asynchrone)

```
Backend Pod (Producer)
    │
    │ 1. Order created via POST /api/orders
    │
    ▼
rabbitmq.publish('order.created', orderData)
    │
    │ AMQP protocol
    │ amqp://rabbitmq.collector-shop.svc.cluster.local:5672
    │
    ▼
RabbitMQ Service (ClusterIP)
    │
    ▼
RabbitMQ Pod
    │
    ├─ Exchange: collector-shop (topic)
    │
    └─ Route order.* → Queue: orders
        │
        │ Consumer listens
        │
        ▼
Backend Pod (Consumer)
    │
    │ rabbitmq.consumeOrders(handler)
    │
    └─→ Process order:
        - Update order status → 'processing'
        - Send confirmation email (future)
        - Update stock (future)
        - Notify seller (future)
```

**Events RabbitMQ** :
- `order.created`: Nouvelle commande
- `order.completed`: Commande finalisée (à implémenter)
- `order.cancelled`: Commande annulée (à implémenter)

### 4. Flux Backend → Stripe (Paiement)

```
Backend Pod
    │
    │ POST /api/checkout/session
    │
    ▼
Stripe API (External)
    │
    │ HTTPS
    │ stripe.checkout.sessions.create()
    │
    ▼
Stripe Checkout Page
    │
    │ Redirect user
    │
    └─→ Success: {FRONTEND_URL}/?payment=success
    └─→ Cancel: {FRONTEND_URL}/?payment=cancel
```

## Configuration Kubernetes

### ConfigMap (collector-config)
```yaml
DATABASE_URL: "file:./dev.db"
FRONTEND_URL: "http://localhost:30080"
RABBITMQ_URL: "amqp://admin:admin123@rabbitmq.collector-shop.svc.cluster.local:5672"
```

### Secrets (collector-secrets)
```yaml
JWT_SECRET: <base64>
STRIPE_SECRET_KEY: <base64>
```

### Services

| Service | Type | Port | TargetPort | NodePort |
|---------|------|------|------------|----------|
| collector-frontend | NodePort | 80 | 80 | 31425 |
| collector-backend | NodePort | 4003 | 4003 | 30003 |
| rabbitmq | NodePort | 5672, 15672 | 5672, 15672 | 30672, 31672 |

### Deployments

**Frontend**:
- Replicas: 1
- Image: ghcr.io/bamekakenang/collector-shop-full-frontend
- Resources: 50m-300m CPU, 64Mi-256Mi RAM
- Probes: / (HTTP GET)

**Backend**:
- Replicas: 1
- Image: collector-backend:latest (local Minikube)
- Resources: 100m-1000m CPU, 256Mi-1Gi RAM
- Probes: /api/health (HTTP GET)
- InitialDelaySeconds: 30/60 (readiness/liveness)

**RabbitMQ**:
- Replicas: 1
- Image: rabbitmq:3.13-alpine
- Resources: 100m-500m CPU, 256Mi-512Mi RAM
- Volumes: EmptyDir pour /var/lib/rabbitmq

### Network Policies
- Backend: Ingress restreint depuis frontend et RabbitMQ uniquement

## Endpoints API

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion (retourne JWT)

### Produits
- `GET /api/products` - Liste des produits
- `GET /api/products/:id` - Détail produit
- `POST /api/products` - Créer produit (SELLER/ADMIN)
- `PATCH /api/products/:id` - Modifier produit

### Commandes
- `POST /api/orders` - Créer commande → **Publie événement RabbitMQ**
- `GET /api/orders` - Liste commandes utilisateur

### Paiement
- `POST /api/checkout/session` - Créer session Stripe

### Admin
- `GET /api/admin/users` - Liste utilisateurs
- `POST /api/admin/users/:id/active` - Activer/désactiver compte
- `POST /api/admin/users/:id/role` - Changer rôle
- `POST /api/admin/products/:id/approve` - Approuver produit
- `POST /api/admin/products/:id/reject` - Rejeter produit
- `DELETE /api/admin/products/:id` - Supprimer produit
- `GET /api/admin/seller-requests` - Liste demandes vendeur
- `POST /api/admin/seller-requests/:id/approve` - Approuver vendeur
- `POST /api/admin/seller-requests/:id/reject` - Rejeter vendeur

### Utilitaires
- `GET /api/health` - Health check
- `POST /api/upload` - Upload image

## Sécurité

### Authentification & Autorisation
- **JWT**: Token signé avec secret, stocké côté client
- **Middleware auth**: Vérifie token sur routes protégées
- **RBAC**: Rôles BUYER, SELLER, ADMIN avec permissions granulaires
- **Password**: Bcrypt avec salt rounds = 10
- **Policy**: Comptes inactifs par défaut, validation admin requise

### CORS
- Origin restreint au frontend configuré (`FRONTEND_URL`)
- Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization

### Network
- Network Policy: Backend accessible uniquement depuis frontend/RabbitMQ
- Services internes: ClusterIP (non exposés)
- Ingress: Point d'entrée unique contrôlé

### Secrets
- JWT_SECRET et STRIPE_SECRET_KEY en Kubernetes Secrets
- Base64 encoded
- Jamais en clair dans le code

## Monitoring & Observabilité

### Health Checks
- **Backend**: `GET /api/health` → `{"status":"ok"}`
- **Readiness Probe**: 30s delay, 10s period
- **Liveness Probe**: 60s delay, 20s period

### Logs
```bash
# Backend logs
kubectl logs -n collector-shop deployment/collector-backend

# RabbitMQ logs
kubectl logs -n collector-shop deployment/rabbitmq

# Frontend logs
kubectl logs -n collector-shop deployment/collector-frontend
```

### RabbitMQ Management UI
Accès: `http://192.168.58.2:31672`
- Credentials: admin/admin123
- Monitoring queues, exchanges, connections
- Message rates, consumer activity

## Scalabilité

### Horizontal Scaling
```bash
# Scale backend
kubectl scale deployment collector-backend -n collector-shop --replicas=3

# Scale frontend
kubectl scale deployment collector-frontend -n collector-shop --replicas=2
```

### Limitations actuelles
- **SQLite**: Database file-based, non-partagée → migration vers PostgreSQL nécessaire
- **EmptyDir volumes**: Non-persistants, données perdues au redémarrage
- **RabbitMQ single node**: Pas de cluster, pas de haute disponibilité
- **Stateless backend**: OK pour scaling horizontal

### Recommandations Production
1. **Database**: PostgreSQL avec PersistentVolume
2. **Storage**: PVC pour uploads, backups
3. **RabbitMQ**: Cluster 3 nodes avec StatefulSet
4. **Cache**: Redis pour sessions/tokens
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack ou Loki
7. **Secrets**: Vault ou External Secrets Operator
8. **Ingress**: Cert-manager pour TLS/HTTPS
9. **Autoscaling**: HPA basé sur CPU/mémoire
10. **GitOps**: ArgoCD pour déploiements

## Accès à l'Application

### Locale (Minikube)
```bash
# Frontend
kubectl port-forward -n collector-shop svc/collector-frontend 8080:80
# Accès: http://localhost:8080

# Backend API
kubectl port-forward -n collector-shop svc/collector-backend 4003:4003
# Accès: http://localhost:4003

# RabbitMQ Management
kubectl port-forward -n collector-shop svc/rabbitmq 15672:15672
# Accès: http://localhost:15672
```

### Via Ingress (si configuré)
```bash
# Ajouter à /etc/hosts
echo "$(minikube ip) collector-shop.local" | sudo tee -a /etc/hosts

# Accès
http://collector-shop.local
```

### Via NodePort
```bash
# Obtenir IP Minikube
minikube ip  # Ex: 192.168.58.2

# Accès direct
Frontend: http://192.168.58.2:31425
Backend: http://192.168.58.2:30003
RabbitMQ: http://192.168.58.2:31672
```

## Déploiement

### Build & Push Images
```bash
# Backend
docker build -t ghcr.io/bamekakenang/collector-shop-full-backend:latest backend/
docker push ghcr.io/bamekakenang/collector-shop-full-backend:latest

# Frontend
docker build -t ghcr.io/bamekakenang/collector-shop-full-frontend:latest frontend/
docker push ghcr.io/bamekakenang/collector-shop-full-frontend:latest
```

### Apply Kubernetes Resources
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/rabbitmq-deployment.yaml
kubectl apply -f k8s/rabbitmq-service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/networkpolicy.yaml
```

### Vérification
```bash
kubectl get all -n collector-shop
kubectl get pods -n collector-shop -w
```

## Maintenance

### Mise à jour Rolling
```bash
# Update image
kubectl set image deployment/collector-backend backend=collector-backend:v2 -n collector-shop

# Rollback si problème
kubectl rollout undo deployment/collector-backend -n collector-shop
```

### Backup Database
```bash
kubectl exec -n collector-shop deployment/collector-backend -- cat /app/dev.db > backup.db
```

### Clean RabbitMQ Queues
```bash
kubectl exec -n collector-shop deployment/rabbitmq -- rabbitmqctl purge_queue orders
```

---

**Architecture validée et opérationnelle le 19/01/2026**
