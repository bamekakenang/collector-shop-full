# Démarche de Développement - Collector Shop

## Table des matières
1. [Attributs Qualité Logicielle](#1-attributs-qualité-logicielle)
2. [Cycle de Vie Dev(Sec)Ops](#2-cycle-de-vie-devsecops)
3. [Métiers Impliqués et Interactions](#3-métiers-impliqués-et-interactions)
4. [Architecture de l'Orchestrateur Kubernetes](#4-architecture-de-lorchestrateurr-kubernetes)
5. [Comparaison CI/CD : GitHub Actions vs GitLab CI](#5-comparaison-cicd--github-actions-vs-gitlab-ci)
6. [Stratégie de Tests](#6-stratégie-de-tests)
7. [Politique de Sécurité](#7-politique-de-sécurité)

---

## 1. Attributs Qualité Logicielle

### Attributs sélectionnés et justification

#### 1.1 Disponibilité (Availability)
**Définition :** Capacité du système à rester opérationnel et accessible aux utilisateurs à tout moment.

**Justification :** Collector Shop est une plateforme e-commerce. Toute indisponibilité entraîne une perte directe de chiffre d'affaires et de confiance des utilisateurs (acheteurs et vendeurs). Les transactions de paiement (Stripe) doivent être traitées sans interruption.

**Mesures mises en place :**
- Déploiement sur Kubernetes (AKS) avec health checks (readiness/liveness probes)
- Redémarrage automatique des pods défaillants
- LoadBalancer Azure pour la distribution du trafic

#### 1.2 Sécurité (Security)
**Définition :** Protection des données, des accès et des transactions contre les menaces et les accès non autorisés.

**Justification :** L'application gère des données personnelles (email, adresse, téléphone), des transactions financières (Stripe) et des rôles d'accès (BUYER, SELLER, ADMIN). Une faille de sécurité exposerait les utilisateurs et engagerait la responsabilité de l'entreprise (RGPD).

**Mesures mises en place :**
- Authentification JWT avec tokens signés
- Hachage bcrypt des mots de passe (coût 10)
- Validation de la force des mots de passe (8 caractères + caractère spécial)
- RBAC (Role-Based Access Control) avec middleware `requireRole`
- CORS restreint aux origines autorisées
- Secrets Kubernetes (JWT_SECRET, STRIPE_SECRET_KEY)
- NetworkPolicy limitant l'accès au backend
- Scan de vulnérabilités Trivy dans le pipeline CI/CD
- npm audit sur les dépendances

#### 1.3 Performance
**Définition :** Capacité du système à répondre aux requêtes dans des délais acceptables, même sous charge.

**Justification :** Les utilisateurs s'attendent à un temps de chargement < 3 secondes. Le catalogue de produits et les images doivent se charger rapidement. Les transactions Stripe doivent être fluides.

**Mesures mises en place :**
- Frontend SPA (Single Page Application) avec Vite pour un chargement rapide
- Build optimisé (tree-shaking, minification)
- Nginx comme reverse proxy avec cache statique
- Messaging asynchrone via RabbitMQ pour les traitements lourds (commandes)
- Limites de ressources CPU/RAM définies dans Kubernetes

#### 1.4 Maintenabilité
**Définition :** Facilité avec laquelle le système peut être modifié, corrigé ou amélioré.

**Justification :** L'application va évoluer (nouvelles fonctionnalités, nouvelles catégories, intégrations). Le code doit être structuré pour permettre des modifications rapides sans régression.

**Mesures mises en place :**
- Architecture en couches (routes → middleware → services → ORM)
- Prisma ORM pour l'abstraction base de données et les migrations
- TypeScript côté frontend pour le typage statique
- Tests automatisés (unitaires + intégration)
- Pipeline CI/CD automatisant build, test et déploiement
- Documentation technique (ARCHITECTURE.md, STACK-COMPLETE.md)

#### 1.5 Fiabilité (Reliability)
**Définition :** Capacité du système à fonctionner correctement dans les conditions prévues, sans perte de données.

**Justification :** Les commandes et les paiements sont des opérations critiques. Une perte de commande ou un doublon de paiement serait inacceptable.

**Mesures mises en place :**
- Messages RabbitMQ persistants avec acknowledgement (ack/nack)
- Gestion d'erreurs exhaustive dans chaque route Express
- Probes Kubernetes (readiness/liveness) pour détecter les pods défaillants
- Comptes utilisateur inactifs par défaut (validation admin requise)

---

## 2. Cycle de Vie Dev(Sec)Ops

### Schéma du cycle de vie

```
                    ┌─────────────────────────────────────────────┐
                    │          CYCLE DE VIE Dev(Sec)Ops           │
                    │            Amélioration Continue             │
                    └─────────────────────────────────────────────┘

        ┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
   ┌───►│  PLAN    │────►│ DEVELOP  │────►│   BUILD   │────►│  TEST    │
   │    │          │     │          │     │           │     │          │
   │    │• Backlog │     │• Code    │     │• Compile  │     │• Unit    │
   │    │• User    │     │• Review  │     │• Docker   │     │• Integ.  │
   │    │  Stories │     │• Lint    │     │  images   │     │• Sécurité│
   │    │• Sprint  │     │• Commit  │     │• Artifacts│     │• npm     │
   │    │  Planning│     │• Push    │     │           │     │  audit   │
   │    └──────────┘     └──────────┘     └───────────┘     └────┬─────┘
   │                                                              │
   │    ┌──────────┐     ┌──────────┐     ┌───────────┐          │
   │    │ FEEDBACK │     │ MONITOR  │     │  DEPLOY   │◄─────────┘
   │    │          │     │          │     │           │
   │    │• Retro   │     │• Logs    │     │• Staging  │
   │    │• Metrics │◄────│• Alertes │◄────│• Prod     │
   │    │• Incidents│    │• Perf.   │     │• K8s/AKS  │
   │    │• Amélio. │     │• Uptime  │     │• GitOps   │
   │    └────┬─────┘     └──────────┘     └───────────┘
   │         │
   └─────────┘
        Boucle continue
```

### Description des phases

**PLAN (Planification)**
Définition des user stories, priorisation du backlog, planification des sprints. Identification des exigences fonctionnelles et non-fonctionnelles. Revue des risques de sécurité dès cette phase.

**DEVELOP (Développement)**
Écriture du code source par les développeurs. Revue de code par les pairs (pull requests). Linting et formatage automatique. Commits sur des branches feature, puis merge vers main.

**BUILD (Construction)**
Compilation du frontend (Vite), construction des images Docker (backend Node.js, frontend Nginx). Génération des artefacts. Déclenchement automatique par le pipeline CI/CD (GitHub Actions ou GitLab CI).

**TEST (Tests)**
Exécution des tests unitaires (Jest), tests d'intégration (Supertest), vérification TypeScript (typecheck), audit de sécurité des dépendances (npm audit), scan de vulnérabilités des images Docker (Trivy).

**DEPLOY (Déploiement)**
Push des images Docker vers le registry (GHCR ou GitLab Registry). Mise à jour des manifests Kubernetes (approche GitOps). Déploiement automatique sur le cluster AKS via ArgoCD ou mise à jour manuelle.

**MONITOR (Supervision)**
Surveillance de l'état des pods Kubernetes (health checks). Collecte des logs applicatifs. Monitoring des métriques de performance. Alertes en cas de défaillance.

**FEEDBACK (Retour d'expérience)**
Analyse des incidents et des métriques. Rétrospectives d'équipe. Identification des axes d'amélioration. Alimentation du backlog pour le prochain cycle.

### Intégration de la sécurité (Sec) dans chaque phase

| Phase | Actions Sécurité |
|-------|-----------------|
| PLAN | Modélisation des menaces, exigences de sécurité |
| DEVELOP | Revue de code sécurité, secrets externalisés |
| BUILD | Scan des dépendances (npm audit) |
| TEST | Trivy sur les images Docker, tests d'authentification |
| DEPLOY | Secrets Kubernetes, NetworkPolicy, RBAC |
| MONITOR | Logs d'accès, détection d'anomalies |
| FEEDBACK | Analyse post-incident, mise à jour des règles |

---

## 3. Métiers Impliqués et Interactions

### Métiers clés

**Développeur Frontend**
Responsable de l'interface utilisateur (React/TypeScript). Développe les composants, gère le routing, intègre les appels API. Travaille avec le designer UX pour l'ergonomie.

**Développeur Backend**
Responsable de l'API REST (Node.js/Express), de la logique métier, de l'accès aux données (Prisma ORM) et des intégrations (Stripe, RabbitMQ). Implémente l'authentification et les autorisations.

**DevOps / SRE**
Responsable de l'infrastructure, du pipeline CI/CD (GitHub Actions, GitLab CI), de l'orchestration Kubernetes (AKS), du monitoring et de la disponibilité. Gère les registries d'images Docker et le déploiement GitOps.

**Architecte Logiciel**
Définit l'architecture globale (choix des technologies, patterns, communication inter-services). Valide les choix techniques. Garant de la cohérence et de l'évolutivité du système.

**Responsable Sécurité (SecOps)**
Définit la politique de sécurité. Configure les scans de vulnérabilités (Trivy, npm audit). Audite les accès, les secrets, les NetworkPolicies. Analyse les risques et gère les incidents de sécurité.

**MOA (Maîtrise d'Ouvrage)**
Représente les besoins métier (acheteurs, vendeurs). Définit les user stories et les critères d'acceptation. Valide les livraisons fonctionnelles. Priorise le backlog.

**Testeur / QA**
Définit la stratégie de tests. Rédige et exécute les cas de test. Identifie les régressions. Valide la qualité avant mise en production.

### Schéma d'interactions

```
                          ┌──────────┐
                          │   MOA    │
                          │(Besoins) │
                          └────┬─────┘
                               │ User Stories
                               │ Priorisation
                               ▼
┌──────────┐           ┌──────────────┐           ┌──────────┐
│Architecte│◄─────────►│  Développeurs │◄─────────►│ Testeur  │
│(Choix    │  Guidance  │  (Front+Back) │  Tests    │   / QA   │
│ tech.)   │  technique │              │  & bugs   │          │
└──────────┘           └──────┬───────┘           └──────────┘
                               │ Code + PR
                               ▼
                        ┌──────────────┐
                        │   DevOps     │
                        │ (CI/CD, K8s) │
                        └──────┬───────┘
                               │ Déploiement
                               ▼
                        ┌──────────────┐
                        │   SecOps     │
                        │ (Sécurité)   │
                        └──────────────┘
```

**Flux d'interactions :**
1. La **MOA** définit les besoins et les transmet à l'**Architecte** et aux **Développeurs**
2. L'**Architecte** guide les choix techniques et valide les solutions
3. Les **Développeurs** codent et soumettent des pull requests
4. Le **Testeur/QA** valide la qualité du code et des fonctionnalités
5. Le **DevOps** automatise le build, test, déploiement via CI/CD
6. Le **SecOps** intervient à chaque phase pour garantir la sécurité
7. Le **feedback** remonte vers la MOA pour alimenter le prochain sprint

---

## 4. Architecture de l'Orchestrateur Kubernetes

### Schéma des composants AKS (Azure Kubernetes Service)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AKS CLUSTER (Azure)                               │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CONTROL PLANE (Managé par Azure)              │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │   │
│  │  │  API Server   │  │  Scheduler   │  │ Controller Manager │    │   │
│  │  │              │  │              │  │                   │    │   │
│  │  │ Point d'entrée│  │ Assigne les  │  │ Gère les boucles  │    │   │
│  │  │ de toutes les │  │ pods aux     │  │ de contrôle :     │    │   │
│  │  │ requêtes API  │  │ worker nodes │  │ • ReplicaSet      │    │   │
│  │  │ (kubectl,     │  │ selon les    │  │ • Deployment      │    │   │
│  │  │  CI/CD, etc.) │  │ ressources   │  │ • Service         │    │   │
│  │  │              │  │ disponibles  │  │ • Node lifecycle  │    │   │
│  │  └──────┬───────┘  └──────────────┘  └───────────────────┘    │   │
│  │         │                                                        │   │
│  │  ┌──────▼───────┐  ┌──────────────────────────────────────┐    │   │
│  │  │    etcd       │  │        Cloud Controller Manager      │    │   │
│  │  │              │  │                                       │    │   │
│  │  │ Base de       │  │ Gère les ressources Azure :          │    │   │
│  │  │ données clé-  │  │ • LoadBalancer (IP publique)         │    │   │
│  │  │ valeur        │  │ • Disques (PersistentVolumes)        │    │   │
│  │  │ distribuée    │  │ • Routes réseau                      │    │   │
│  │  │              │  │ • Intégration ACR (pull images)      │    │   │
│  │  │ Stocke l'état │  │                                       │    │   │
│  │  │ complet du    │  └──────────────────────────────────────┘    │   │
│  │  │ cluster       │                                               │   │
│  │  └──────────────┘                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              │ API calls                                 │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              WORKER NODE (Standard_B2s_v2 - VM Azure)           │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │   │
│  │  │   kubelet     │  │  kube-proxy  │  │ Container Runtime  │    │   │
│  │  │              │  │              │  │   (containerd)     │    │   │
│  │  │ Agent sur     │  │ Gère les     │  │                   │    │   │
│  │  │ chaque node.  │  │ règles       │  │ Exécute les       │    │   │
│  │  │ Communique    │  │ réseau       │  │ containers dans   │    │   │
│  │  │ avec l'API    │  │ (iptables/   │  │ les pods          │    │   │
│  │  │ Server.       │  │ IPVS).       │  │                   │    │   │
│  │  │              │  │              │  │                   │    │   │
│  │  │ Responsable   │  │ Permet la    │  │ Pull des images   │    │   │
│  │  │ du cycle de   │  │ communication│  │ depuis l'ACR      │    │   │
│  │  │ vie des pods  │  │ Service →    │  │ Azure             │    │   │
│  │  │ (start, stop, │  │ Pod          │  │                   │    │   │
│  │  │  health check)│  │              │  │                   │    │   │
│  │  └──────────────┘  └──────────────┘  └───────────────────┘    │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │                         PODS                                │ │   │
│  │  │                                                              │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │   │
│  │  │  │  Frontend   │  │  Backend    │  │  RabbitMQ   │       │ │   │
│  │  │  │  Pod        │  │  Pod        │  │  Pod        │       │ │   │
│  │  │  │             │  │             │  │             │       │ │   │
│  │  │  │ Nginx +     │  │ Node.js +   │  │ RabbitMQ    │       │ │   │
│  │  │  │ React SPA   │  │ Express +   │  │ 3.13 +      │       │ │   │
│  │  │  │             │  │ Prisma +    │  │ Management  │       │ │   │
│  │  │  │ Port: 80    │  │ SQLite      │  │             │       │ │   │
│  │  │  │             │  │             │  │ Ports:      │       │ │   │
│  │  │  │ Service:    │  │ Port: 4003  │  │ 5672 (AMQP) │       │ │   │
│  │  │  │ LoadBalancer│  │             │  │ 15672 (UI)  │       │ │   │
│  │  │  │ (IP pub.)   │  │ Service:    │  │             │       │ │   │
│  │  │  │             │  │ ClusterIP   │  │ Service:    │       │ │   │
│  │  │  │             │  │             │  │ ClusterIP   │       │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OBJETS KUBERNETES TRANSVERSAUX                                  │   │
│  │                                                                   │   │
│  │  • Namespace: collector-shop (isolation logique)                 │   │
│  │  • ConfigMap: collector-config (DATABASE_URL, FRONTEND_URL,     │   │
│  │    RABBITMQ_URL)                                                 │   │
│  │  • Secret: collector-secrets (JWT_SECRET, STRIPE_SECRET_KEY)    │   │
│  │  • NetworkPolicy: backend-restrict-ingress (filtre trafic)      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

                              │
                              │ Accès externe
                              ▼

                 ┌──────────────────────┐
                 │  Azure Load Balancer  │
                 │  IP: 9.223.210.37    │
                 │  Port 80 → Frontend  │
                 └──────────────────────┘
```

### Rôle de chaque composant

**API Server** : Point d'entrée unique pour toutes les opérations sur le cluster. Toutes les commandes kubectl, les appels CI/CD et les communications internes passent par lui. Il valide et persiste les changements dans etcd.

**etcd** : Base de données clé-valeur distribuée qui stocke l'état complet du cluster (configurations, secrets, état des pods, etc.). C'est la source de vérité du cluster.

**Scheduler** : Décide sur quel worker node placer chaque nouveau pod en fonction des ressources disponibles (CPU, RAM) et des contraintes (affinités, tolérances).

**Controller Manager** : Exécute les boucles de contrôle qui maintiennent l'état désiré du cluster. Par exemple, si un pod tombe, le ReplicaSet Controller en recrée un nouveau.

**Cloud Controller Manager** : Spécifique à AKS. Gère l'intégration avec Azure : création de LoadBalancers, provisioning de disques, routes réseau.

**kubelet** : Agent présent sur chaque worker node. Reçoit les instructions de l'API Server et gère le cycle de vie des pods (démarrage, arrêt, health checks).

**kube-proxy** : Gère les règles réseau sur chaque node. Permet la communication entre Services et Pods (translation Service IP → Pod IP).

**Container Runtime (containerd)** : Exécute les containers. Pull les images depuis l'ACR (Azure Container Registry) et les démarre dans les pods.

---

## 5. Comparaison CI/CD : GitHub Actions vs GitLab CI

### Vue d'ensemble

| Critère | GitHub Actions | GitLab CI |
|---------|---------------|-----------|
| **Modèle** | SaaS intégré à GitHub | SaaS ou self-hosted, intégré à GitLab |
| **Configuration** | YAML dans `.github/workflows/` | YAML dans `.gitlab-ci.yml` (racine) |
| **Runners** | GitHub-hosted ou self-hosted | GitLab.com shared ou self-hosted |
| **Registry** | GHCR (GitHub Container Registry) | GitLab Container Registry (intégré) |
| **Déclenchement** | Events (push, PR, schedule, etc.) | Events (push, MR, schedule, etc.) |

### Forces

**GitHub Actions :**
- Marketplace très riche (>15 000 actions communautaires)
- Intégration native avec l'écosystème GitHub (Issues, PRs, GHCR, Dependabot)
- Configuration simple pour les cas courants (actions pré-faites)
- Minutes gratuites généreuses (2 000 min/mois pour les repos publics)
- Matrice de build (matrix strategy) puissante
- Dependency Review Action pour les PRs

**GitLab CI :**
- Pipeline as Code plus structuré (stages séquentiels explicites)
- Registry d'images Docker intégré nativement (pas besoin de GHCR séparé)
- Cache d'artefacts entre jobs très performant
- Environnements de déploiement intégrés (staging, production) avec review apps
- Interface de visualisation des pipelines plus claire (DAG)
- Auto DevOps : templates CI/CD prêts à l'emploi
- Self-hosted runners gratuits et illimités

### Faiblesses

**GitHub Actions :**
- Syntaxe YAML parfois verbeuse pour les workflows complexes
- Pas de visualisation DAG native des jobs
- Partage d'artefacts entre jobs moins intuitif (upload/download-artifact)
- Minutes limitées sur les repos privés (plan gratuit)
- Pas d'environnements de review intégrés nativement

**GitLab CI :**
- Marketplace d'extensions moins riche que GitHub
- Configuration Docker-in-Docker (DinD) plus complexe
- Courbe d'apprentissage plus longue pour les fonctionnalités avancées
- Performance des shared runners parfois lente (GitLab.com)
- Moins de communauté open-source par rapport à GitHub

### Limites

**GitHub Actions :**
- Maximum 6 heures par job
- Maximum 35 jours de rétention des artefacts
- Pas de cache natif entre workflows (seulement via actions/cache)
- Secrets ne sont pas accessibles dans les forks (sécurité PR)

**GitLab CI :**
- Maximum 24 heures par job (configurable en self-hosted)
- Taille des artefacts limitée à 1 Go (plan gratuit)
- Les variables CI sont globales par défaut (risque de fuite entre stages)
- Le runner partagé peut être lent pour les builds Docker

### Comparaison appliquée à Collector Shop

| Étape Pipeline | GitHub Actions (`ci.yml`) | GitLab CI (`.gitlab-ci.yml`) |
|---------------|--------------------------|------------------------------|
| Tests backend | Job `backend` avec setup-node | Stage `test` > `backend:test` |
| Tests frontend | Job `frontend` avec setup-node | Stage `test` > `frontend:test` |
| Build images | Job `build-and-push-images` | Stage `build` > `build:images` |
| Scan sécurité | Trivy Action (marketplace) | Trivy CLI (image aquasec) |
| Push registry | `docker push` vers GHCR | `docker push` vers GitLab Registry |
| Déploiement | Commit GitOps + push | Commit GitOps + push |
| Revue dépendances | `dependency-review-action` | `npm audit --json` + artefact |

### Recommandation

Pour Collector Shop, **GitHub Actions** est recommandé car :
- Le code source est déjà sur GitHub
- Le pipeline est déjà fonctionnel et testé
- GHCR est intégré et gratuit
- L'écosystème (Dependabot, Security Alerts, CODEOWNERS) est déjà en place

GitLab CI serait préférable si :
- L'entreprise utilise déjà GitLab pour le SCM
- On a besoin de review apps pour chaque merge request
- On veut un self-hosted runner sur l'infrastructure interne

---

## 6. Stratégie de Tests

### Types de tests et placement dans le pipeline CI/CD

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PIPELINE CI/CD                                │
  │                                                                   │
  │  COMMIT     BUILD       TEST            SCAN         DEPLOY      │
  │    │          │           │                │            │         │
  │    ▼          ▼           ▼                ▼            ▼         │
  │  ┌────┐   ┌────────┐  ┌──────────────┐ ┌──────────┐ ┌───────┐ │
  │  │Lint│   │Compile │  │Tests         │ │Sécurité  │ │Smoke  │ │
  │  │Type│   │Docker  │  │Unitaires     │ │Trivy     │ │Test   │ │
  │  │check│  │Build   │  │Intégration   │ │npm audit │ │Health │ │
  │  └────┘   └────────┘  │Fonctionnels  │ │SAST      │ │Check  │ │
  │                        └──────────────┘ └──────────┘ └───────┘ │
  └─────────────────────────────────────────────────────────────────┘
```

### 6.1 Tests Unitaires
**Objectif :** Vérifier le comportement isolé de chaque fonction/module.
**Outils :** Jest
**Place dans le CI/CD :** Stage TEST (exécutés à chaque push et chaque PR)
**Couverture actuelle :**
- `auth.test.js` : signToken, authMiddleware, requireRole (5 tests)
- `server.test.js` : validation mot de passe, normalisation rôles, calcul prix (8 tests)
- `rabbitmq.test.js` : connexion, publication, dégradation gracieuse (3 tests)

**Exemples :**
- Vérification qu'un token JWT signé contient les bons champs
- Rejet d'un mot de passe sans caractère spécial
- Calcul correct du prix total (produit + shipping × quantité)

### 6.2 Tests d'Intégration
**Objectif :** Vérifier que les composants fonctionnent ensemble (API + Base de données).
**Outils :** Supertest + Jest + SQLite temporaire
**Place dans le CI/CD :** Stage TEST (après les tests unitaires)
**Couverture actuelle :**
- `test-integration.js` : Health check, inscription, login bloqué (inactive), login admin, endpoint admin

**Exemples :**
- Inscription d'un utilisateur → vérification en base
- Login interdit tant que le compte est inactif
- Accès admin refusé pour un utilisateur BUYER

### 6.3 Tests de Sécurité (SAST/SCA)
**Objectif :** Détecter les vulnérabilités dans le code et les dépendances.
**Outils :** Trivy (images Docker), npm audit (dépendances), Dependency Review (PRs)
**Place dans le CI/CD :** Stage SCAN (après le build des images Docker)

**Ce qui est scanné :**
- Vulnérabilités OS dans les images Docker (Alpine, Node.js)
- Vulnérabilités dans les dépendances npm (backend + frontend)
- Revue des nouvelles dépendances ajoutées dans les PRs

### 6.4 Tests Fonctionnels / E2E (à implémenter)
**Objectif :** Simuler le parcours utilisateur complet.
**Outils recommandés :** Cypress ou Playwright
**Place dans le CI/CD :** Stage TEST (après les tests d'intégration)

**Scénarios à couvrir :**
- Inscription → validation admin → login → navigation catalogue
- Ajout d'un produit par un vendeur → approbation admin → visible dans le catalogue
- Achat d'un produit → création commande → événement RabbitMQ

### 6.5 Tests de Charge / Performance (à implémenter)
**Objectif :** Vérifier que l'application tient sous charge.
**Outils recommandés :** k6, Artillery ou Apache JMeter
**Place dans le CI/CD :** Exécution périodique (schedule) ou avant une mise en production majeure

**Métriques à mesurer :**
- Temps de réponse moyen (objectif : < 200ms pour les API)
- Temps de réponse P95 (objectif : < 500ms)
- Requêtes par seconde supportées
- Taux d'erreur sous charge

### 6.6 Smoke Tests (post-déploiement)
**Objectif :** Vérifier que l'application fonctionne après déploiement.
**Place dans le CI/CD :** Stage DEPLOY (après le déploiement sur le cluster)

**Vérifications :**
- `GET /api/health` retourne `{ status: "ok" }`
- `GET /` retourne le HTML de la SPA (status 200)
- Le frontend charge les assets JS/CSS sans erreur 404

---

## 7. Politique de Sécurité

### 7.1 Inventaire du Parc Applicatif

| Composant | Technologie | Version | Exposition | Criticité |
|-----------|------------|---------|------------|-----------|
| Frontend SPA | React + Nginx | 18.3.1 | Publique (Internet) | Haute |
| Backend API | Node.js + Express | 20 / 4.21.2 | Interne (ClusterIP) | Critique |
| Base de données | SQLite + Prisma | 6.2.1 | Interne (fichier local) | Critique |
| Message Broker | RabbitMQ | 3.13 | Interne (ClusterIP) | Moyenne |
| Paiement | Stripe API | Externe | HTTPS sortant | Critique |
| Orchestrateur | AKS (Kubernetes) | 1.33 | Control plane managé | Critique |
| Registry images | ACR (Azure) | Managé | Privé (authentifié) | Haute |
| CI/CD | GitHub Actions | Managé | Privé (repo) | Haute |

### 7.2 Scans de Sécurité

**Scans automatisés dans le pipeline CI/CD :**

| Type de scan | Outil | Fréquence | Cible |
|-------------|-------|-----------|-------|
| Vulnérabilités dépendances | npm audit | À chaque push | package.json (back + front) |
| Vulnérabilités images Docker | Trivy | À chaque build | Images backend et frontend |
| Revue des nouvelles dépendances | Dependency Review Action | À chaque PR | Dépendances ajoutées/modifiées |
| Secrets exposés | git-secrets / Gitleaks | À chaque commit | Code source |

**Scans périodiques (à mettre en place) :**

| Type de scan | Outil recommandé | Fréquence | Cible |
|-------------|-----------------|-----------|-------|
| DAST (Dynamic Application Security Testing) | OWASP ZAP | Hebdomadaire | Application déployée |
| Analyse de configuration K8s | kube-bench, kubesec | Mensuel | Manifests K8s |
| Audit d'accès | Azure AD logs | Continu | Accès au cluster AKS |

### 7.3 Supervision des Applications et Infrastructures

**Supervision applicative :**
- Health checks Kubernetes (readiness + liveness probes) sur chaque pod
- Logs applicatifs collectés via `kubectl logs`
- Monitoring des métriques HTTP (codes de réponse, latence)

**Supervision infrastructure :**
- Azure Monitor pour le cluster AKS (CPU, RAM, réseau des nodes)
- Alertes Azure sur les pods en CrashLoopBackOff ou les nodes NotReady
- Surveillance de l'espace disque et des quotas de ressources

**Outils recommandés pour une mise en place complète :**
- **Prometheus + Grafana** : collecte de métriques et dashboards
- **ELK Stack (Elasticsearch + Logstash + Kibana)** ou **Loki** : agrégation de logs
- **AlertManager** : alertes par email/Slack en cas d'anomalie

### 7.4 Analyse des Risques

**Méthode : EBIOS RM (Expression des Besoins et Identification des Objectifs de Sécurité)**

#### Risques identifiés

| # | Risque | Impact | Probabilité | Criticité | Mitigation |
|---|--------|--------|------------|-----------|------------|
| R1 | Vol de tokens JWT | Haute | Moyenne | Critique | Expiration 7j, HTTPS, HttpOnly cookies (à implémenter) |
| R2 | Injection SQL | Haute | Faible | Haute | Prisma ORM (requêtes paramétrées) |
| R3 | Fuite de secrets | Critique | Moyenne | Critique | Secrets K8s, pas de secrets dans le code, git-secrets |
| R4 | DDoS sur le frontend | Moyenne | Moyenne | Haute | Rate limiting (à implémenter), Azure DDoS Protection |
| R5 | Escalade de privilèges | Critique | Faible | Haute | RBAC strict (requireRole middleware), validation admin |
| R6 | Vulnérabilité dans une dépendance | Haute | Haute | Critique | npm audit + Trivy automatisés dans CI/CD |
| R7 | Perte de données (SQLite) | Haute | Moyenne | Haute | Migration vers PostgreSQL recommandée en production |
| R8 | Accès non autorisé au cluster | Critique | Faible | Critique | RBAC K8s, Azure AD, NetworkPolicy |

#### Plan de gestion des incidents

```
  Détection → Qualification → Confinement → Éradication → Récupération → Post-mortem
      │            │              │              │              │              │
   Alertes     Évaluer       Isoler le      Corriger la    Restaurer     Analyser
   Monitoring  la gravité    composant      vulnérabilité  le service    les causes
   Logs        et l'impact   affecté        ou le vecteur  normal        et améliorer
```

**Niveaux de gravité :**
- **P1 (Critique)** : Service totalement indisponible ou fuite de données → réponse immédiate (< 15 min)
- **P2 (Haute)** : Fonctionnalité majeure dégradée → réponse < 1h
- **P3 (Moyenne)** : Fonctionnalité mineure impactée → réponse < 4h
- **P4 (Basse)** : Anomalie cosmétique ou optimisation → prochain sprint

### 7.5 Intégration dans l'Amélioration Continue

```
  ┌─────────────────────────────────────────────────────┐
  │            BOUCLE D'AMÉLIORATION CONTINUE            │
  │                                                       │
  │   ┌──────────┐                     ┌──────────────┐ │
  │   │ MESURER  │────────────────────►│  ANALYSER    │ │
  │   │          │                     │              │ │
  │   │ • Scans  │                     │ • Identifier │ │
  │   │ • Audits │                     │   les failles│ │
  │   │ • Logs   │                     │ • Prioriser  │ │
  │   │ • KPIs   │                     │   les risques│ │
  │   └──────────┘                     └──────┬───────┘ │
  │        ▲                                   │         │
  │        │                                   ▼         │
  │   ┌────┴───────┐                   ┌──────────────┐ │
  │   │ VÉRIFIER   │◄─────────────────│  CORRIGER    │ │
  │   │            │                   │              │ │
  │   │ • Retester │                   │ • Patcher    │ │
  │   │ • Valider  │                   │ • Durcir     │ │
  │   │ • Auditer  │                   │ • Former     │ │
  │   └────────────┘                   └──────────────┘ │
  └─────────────────────────────────────────────────────┘
```

**Actions concrètes d'amélioration continue :**

1. **Hebdomadaire** : Revue des résultats Trivy et npm audit, mise à jour des dépendances critiques
2. **Mensuel** : Audit des accès et des secrets, revue des NetworkPolicies
3. **Trimestriel** : Exercice de réponse à incident, revue de la politique de sécurité
4. **Annuel** : Audit de sécurité externe, formation sécurité de l'équipe

**KPIs de sécurité à suivre :**
- Nombre de vulnérabilités critiques/hautes ouvertes
- Temps moyen de correction des vulnérabilités (MTTR)
- Couverture des scans automatisés (% du pipeline)
- Nombre d'incidents de sécurité par trimestre
- Taux de conformité des configurations K8s
