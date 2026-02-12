#!/bin/bash
# ============================================================
# Test Auth0 Authentication - Collector Shop Demo
# ============================================================
# PRÉREQUIS : Créer un compte gratuit sur https://auth0.com
#
# Configuration Auth0 (5 min) :
# 1. Créer un tenant (ex: collector-shop-demo)
# 2. Applications > Create Application > "Collector Shop" > Regular Web App
# 3. Settings > Allowed Callback URLs : http://localhost:3000/callback
# 4. Settings > Allowed Logout URLs : http://localhost:3000
# 5. Copier le Domain, Client ID et Client Secret ci-dessous
# 6. User Management > Users > Create User :
#    - Email: buyer@collector.shop / Password: Test1234!
#    - Email: admin@collector.shop / Password: Test1234!
# 7. Auth Pipeline > Rules (ou Actions) :
#    Ajouter un rôle custom dans le token (optionnel)
# ============================================================

# --- CONFIGURER CES VALEURS ---
AUTH0_DOMAIN="${AUTH0_DOMAIN:-votre-tenant.auth0.com}"
AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID:-votre_client_id}"
AUTH0_CLIENT_SECRET="${AUTH0_CLIENT_SECRET:-votre_client_secret}"
AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-https://$AUTH0_DOMAIN/api/v2/}"

echo "============================================"
echo "  🔐 DEMO AUTH0 — Collector Shop"
echo "============================================"
echo ""
echo "📌 Tenant : $AUTH0_DOMAIN"
echo ""

if [[ "$AUTH0_DOMAIN" == "votre-tenant.auth0.com" ]]; then
  echo "⚠️  Configurez d'abord les variables d'environnement :"
  echo ""
  echo "  export AUTH0_DOMAIN=votre-tenant.auth0.com"
  echo "  export AUTH0_CLIENT_ID=votre_client_id"
  echo "  export AUTH0_CLIENT_SECRET=votre_client_secret"
  echo ""
  echo "Puis relancez : bash test-auth0.sh"
  exit 1
fi

# --- Test 1 : Login utilisateur (Resource Owner Password) ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 1 : Authentification BUYER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
USER_RESPONSE=$(curl -s -X POST "https://$AUTH0_DOMAIN/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$AUTH0_CLIENT_ID" \
  -d "client_secret=$AUTH0_CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=buyer@collector.shop" \
  -d "password=Test1234!" \
  -d "scope=openid profile email")

if echo "$USER_RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)['id_token']" 2>/dev/null; then
  ID_TOKEN=$(echo "$USER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id_token'])" 2>/dev/null)
  echo "✅ Login réussi — buyer@collector.shop"
  echo ""
  echo "📦 ID Token JWT (payload décodé) :"
  echo "$ID_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null
  echo ""
else
  echo "❌ Échec du login"
  echo "   Réponse : $(echo "$USER_RESPONSE" | python3 -m json.tool 2>/dev/null)"
fi

# --- Test 2 : Login admin ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 2 : Authentification ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ADMIN_RESPONSE=$(curl -s -X POST "https://$AUTH0_DOMAIN/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$AUTH0_CLIENT_ID" \
  -d "client_secret=$AUTH0_CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=admin@collector.shop" \
  -d "password=Test1234!" \
  -d "scope=openid profile email")

if echo "$ADMIN_RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)['id_token']" 2>/dev/null; then
  echo "✅ Login réussi — admin@collector.shop"
else
  echo "⚠️  admin@collector.shop non créé (optionnel)"
fi

# --- Test 3 : Mauvais mot de passe ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 3 : Mauvais mot de passe (doit échouer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_RESPONSE=$(curl -s -X POST "https://$AUTH0_DOMAIN/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$AUTH0_CLIENT_ID" \
  -d "client_secret=$AUTH0_CLIENT_SECRET" \
  -d "grant_type=password" \
  -d "username=buyer@collector.shop" \
  -d "password=wrong")

ERROR=$(echo "$BAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error_description','Accès refusé'))" 2>/dev/null)
echo "✅ Rejeté comme attendu : $ERROR"

# --- Test 4 : OpenID Discovery ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 4 : OpenID Connect Discovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -sf "https://$AUTH0_DOMAIN/.well-known/openid-configuration" | python3 -m json.tool | head -15
echo "  ..."

echo ""
echo "============================================"
echo "  ✅ DEMO AUTH0 TERMINÉE"
echo "============================================"
echo ""
echo "🌐 Dashboard : https://manage.auth0.com"
echo "🔗 Issuer    : https://$AUTH0_DOMAIN/"
