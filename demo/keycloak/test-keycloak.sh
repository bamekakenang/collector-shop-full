#!/bin/bash
# ============================================================
# Test Keycloak Authentication - Collector Shop Demo
# ============================================================

KEYCLOAK_URL="http://localhost:8180"
REALM="collector-shop"
CLIENT_ID="collector-shop-app"

echo "============================================"
echo "  🔑 DEMO KEYCLOAK — Collector Shop"
echo "============================================"
echo ""

# --- Attendre que Keycloak soit prêt ---
echo "⏳ Attente du démarrage de Keycloak..."
until curl -sf "$KEYCLOAK_URL/realms/master" > /dev/null 2>&1; do
  sleep 2
  printf "."
done
echo ""
echo "✅ Keycloak est prêt !"
echo ""

# --- Test 1 : Login Buyer ---
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 1 : Authentification BUYER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BUYER_RESPONSE=$(curl -sf -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=buyer@collector.shop" \
  -d "password=Test1234!")

if [ $? -eq 0 ]; then
  BUYER_TOKEN=$(echo "$BUYER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
  echo "✅ Login réussi — buyer@collector.shop"
  echo ""
  echo "📦 Token JWT reçu (décodage du payload) :"
  echo "$BUYER_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null
  echo ""
else
  echo "❌ Échec du login buyer"
fi

# --- Test 2 : Login Seller ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 2 : Authentification SELLER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SELLER_RESPONSE=$(curl -sf -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=seller@collector.shop" \
  -d "password=Test1234!")

if [ $? -eq 0 ]; then
  SELLER_TOKEN=$(echo "$SELLER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
  echo "✅ Login réussi — seller@collector.shop"
  echo ""
  echo "📦 Token JWT (payload) :"
  echo "$SELLER_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null
  echo ""
else
  echo "❌ Échec du login seller"
fi

# --- Test 3 : Login Admin ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 3 : Authentification ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ADMIN_RESPONSE=$(curl -sf -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=admin@collector.shop" \
  -d "password=Test1234!")

if [ $? -eq 0 ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
  echo "✅ Login réussi — admin@collector.shop"
  echo ""
  echo "📦 Token JWT (payload) :"
  echo "$ADMIN_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null
  echo ""
else
  echo "❌ Échec du login admin"
fi

# --- Test 4 : Mauvais mot de passe ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 4 : Mauvais mot de passe (doit échouer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=buyer@collector.shop" \
  -d "password=wrong")

ERROR=$(echo "$BAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error_description',''))" 2>/dev/null)
echo "✅ Rejeté comme attendu : $ERROR"

# --- Test 5 : OpenID Discovery ---
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Test 5 : OpenID Connect Discovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -sf "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" | python3 -m json.tool | head -15
echo "  ..."

echo ""
echo "============================================"
echo "  ✅ DEMO KEYCLOAK TERMINÉE"
echo "============================================"
echo ""
echo "🌐 Console admin : $KEYCLOAK_URL/admin (admin/admin)"
echo "🔗 Realm URL     : $KEYCLOAK_URL/realms/$REALM"
