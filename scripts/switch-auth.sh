#!/bin/bash

# Script pour basculer entre les différentes solutions d'authentification
# Usage: ./scripts/switch-auth.sh [keycloak|auth0|custom]

set -e

AUTH_PROVIDER=$1

if [ -z "$AUTH_PROVIDER" ]; then
    echo "Usage: ./scripts/switch-auth.sh [keycloak|auth0|custom]"
    echo ""
    echo "Solutions disponibles:"
    echo "  - keycloak : Utiliser Keycloak (open-source, self-hosted)"
    echo "  - auth0    : Utiliser Auth0 (SaaS, cloud-managed)"
    echo "  - custom   : Utiliser l'authentification JWT custom actuelle"
    exit 1
fi

case $AUTH_PROVIDER in
    keycloak)
        echo "🔐 Basculement vers Keycloak..."
        echo ""
        
        # Vérifier que la branche existe
        if ! git rev-parse --verify feature/keycloak-integration >/dev/null 2>&1; then
            echo "❌ La branche feature/keycloak-integration n'existe pas."
            echo "   Créez-la d'abord avec l'intégration Keycloak."
            exit 1
        fi
        
        # Arrêter les containers actuels
        echo "📦 Arrêt des containers Docker existants..."
        docker-compose down 2>/dev/null || true
        
        # Checkout la branche Keycloak
        echo "🔀 Basculement vers la branche Keycloak..."
        git checkout feature/keycloak-integration
        
        # Démarrer avec Keycloak
        echo "🚀 Démarrage de l'environnement avec Keycloak..."
        echo ""
        echo "⏳ Le démarrage de Keycloak peut prendre 30-60 secondes..."
        docker-compose -f docker-compose.keycloak.yml up -d
        
        echo ""
        echo "✅ Keycloak est en cours de démarrage!"
        echo ""
        echo "📋 Informations importantes:"
        echo "   - Keycloak Admin: http://localhost:8080"
        echo "     Username: admin"
        echo "     Password: admin"
        echo ""
        echo "   - Frontend: http://localhost:5173"
        echo "   - Backend: http://localhost:4004"
        echo ""
        echo "📝 Prochaines étapes:"
        echo "   1. Attendre 30-60 secondes que Keycloak démarre"
        echo "   2. Se connecter à l'admin Keycloak"
        echo "   3. Créer un realm 'collector-shop'"
        echo "   4. Créer les clients (collector-backend, collector-frontend)"
        echo "   5. Configurer les rôles (ADMIN, SELLER, BUYER)"
        echo ""
        ;;
        
    auth0)
        echo "🔐 Basculement vers Auth0..."
        echo ""
        
        # Vérifier que la branche existe
        if ! git rev-parse --verify feature/auth0-integration >/dev/null 2>&1; then
            echo "❌ La branche feature/auth0-integration n'existe pas."
            echo "   Créez-la d'abord avec l'intégration Auth0."
            exit 1
        fi
        
        # Vérifier que les variables Auth0 sont configurées
        if [ ! -f .env ] || ! grep -q "AUTH0_DOMAIN" .env; then
            echo "⚠️  Attention: Les variables Auth0 ne sont pas configurées dans .env"
            echo ""
            echo "📝 Ajoutez ces variables dans votre fichier .env:"
            echo ""
            echo "AUTH0_DOMAIN=your-tenant.auth0.com"
            echo "AUTH0_AUDIENCE=https://api.collector-shop.com"
            echo "AUTH0_CLIENT_ID=your-backend-client-id"
            echo "AUTH0_CLIENT_SECRET=your-backend-client-secret"
            echo "AUTH0_FRONTEND_CLIENT_ID=your-frontend-client-id"
            echo ""
            read -p "Voulez-vous continuer quand même? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
        
        # Arrêter les containers actuels
        echo "📦 Arrêt des containers Docker existants..."
        docker-compose -f docker-compose.keycloak.yml down 2>/dev/null || true
        docker-compose down 2>/dev/null || true
        
        # Checkout la branche Auth0
        echo "🔀 Basculement vers la branche Auth0..."
        git checkout feature/auth0-integration
        
        # Démarrer avec Auth0
        echo "🚀 Démarrage de l'environnement avec Auth0..."
        docker-compose -f docker-compose.auth0.yml up -d
        
        echo ""
        echo "✅ L'application est démarrée avec Auth0!"
        echo ""
        echo "📋 Informations importantes:"
        echo "   - Auth0 Dashboard: https://manage.auth0.com"
        echo "   - Frontend: http://localhost:5173"
        echo "   - Backend: http://localhost:4004"
        echo ""
        echo "📝 Configuration Auth0 requise:"
        echo "   1. Créer une application SPA (collector-frontend)"
        echo "   2. Créer une API (collector-backend)"
        echo "   3. Configurer les Callback URLs et Logout URLs"
        echo "   4. Créer les rôles (ADMIN, SELLER, BUYER)"
        echo "   5. Ajouter une Rule/Action pour inclure les rôles dans le token"
        echo ""
        ;;
        
    custom)
        echo "🔐 Basculement vers l'authentification JWT custom..."
        echo ""
        
        # Arrêter les containers actuels
        echo "📦 Arrêt des containers Docker existants..."
        docker-compose -f docker-compose.keycloak.yml down 2>/dev/null || true
        docker-compose -f docker-compose.auth0.yml down 2>/dev/null || true
        docker-compose down 2>/dev/null || true
        
        # Revenir sur main
        echo "🔀 Basculement vers la branche main..."
        git checkout main
        
        # Démarrer avec l'auth custom
        echo "🚀 Démarrage de l'environnement avec auth custom..."
        docker-compose up -d
        
        echo ""
        echo "✅ L'application est démarrée avec l'authentification JWT custom!"
        echo ""
        echo "📋 Informations:"
        echo "   - Frontend: http://localhost:5173"
        echo "   - Backend: http://localhost:4004"
        echo ""
        echo "🔑 Authentification:"
        echo "   - Système JWT custom géré en interne"
        echo "   - Inscription/Login via l'interface frontend"
        echo "   - Admin par défaut à créer via seed ou inscription"
        echo ""
        ;;
        
    *)
        echo "❌ Solution d'authentification inconnue: $AUTH_PROVIDER"
        echo ""
        echo "Solutions disponibles: keycloak, auth0, custom"
        exit 1
        ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Basculement terminé!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
