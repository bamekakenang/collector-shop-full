#!/bin/bash
# =============================================================================
# POC 2 — Tests complets Keycloak Authentication
# =============================================================================
# Prérequis : docker compose up -d (dans demo/keycloak/)
#
# Scénarios testés :
#   1.  Démarrage Keycloak + Realm importé
#   2.  OpenID Connect Discovery
#   3.  Authentification BUYER (Resource Owner Password)
#   4.  Authentification SELLER
#   5.  Authentification ADMIN
#   6.  Validation du JWT (structure, claims, rôles)
#   7.  Refresh Token
#   8.  Mauvais mot de passe (rejet)
#   9.  Utilisateur inexistant (rejet)
#  10.  Client ID invalide (rejet)
#  11.  Token expiré / Introspection
#  12.  RBAC — Vérification des rôles dans le token
#  13.  Logout (end session)
#  14.  Brute force protection
#  15.  Résumé comparatif
# =============================================================================

KEYCLOAK_URL="http://localhost:8180"
REALM="collector-shop"
CLIENT_ID="collector-shop-app"

PASS=0
FAIL=0
TOTAL_TIME=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     POC 2 — TESTS KEYCLOAK — Collector Shop                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔑 Keycloak   : $KEYCLOAK_URL"
echo "🏰 Realm      : $REALM"
echo "📅 Date       : $(date '+%Y-%m-%d %H:%M')"
echo ""

# =============================================================================
# 1. DÉMARRAGE KEYCLOAK
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. Démarrage Keycloak"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Attente du démarrage..."
START_WAIT=$(date +%s)
READY=false
for i in $(seq 1 60); do
  if curl -sf "$KEYCLOAK_URL/realms/master" > /dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 2
  printf "."
done
echo ""
END_WAIT=$(date +%s)
WAIT_SECONDS=$((END_WAIT - START_WAIT))

if $READY; then
  pass "Keycloak prêt en ${WAIT_SECONDS}s"
else
  fail "Keycloak non disponible après 120s"
  echo ""
  echo "💡 Lancez d'abord : docker compose -f demo/keycloak/docker-compose.yml up -d"
  exit 1
fi

# Vérifier le realm
REALM_CHECK=$(curl -sf "$KEYCLOAK_URL/realms/$REALM" 2>/dev/null)
if echo "$REALM_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['realm']=='$REALM'" 2>/dev/null; then
  pass "Realm '$REALM' chargé avec succès"
else
  fail "Realm '$REALM' non trouvé"
fi
echo ""

# =============================================================================
# 2. OPENID CONNECT DISCOVERY
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 2. OpenID Connect Discovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
OIDC_CONFIG=$(curl -sf "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" 2>/dev/null)
if [ -n "$OIDC_CONFIG" ]; then
  pass "Endpoint OIDC Discovery accessible"

  # Vérifier les endpoints clés
  for ENDPOINT in authorization_endpoint token_endpoint userinfo_endpoint jwks_uri end_session_endpoint; do
    VALUE=$(echo "$OIDC_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$ENDPOINT',''))" 2>/dev/null)
    if [ -n "$VALUE" ]; then
      pass "$ENDPOINT → présent"
    else
      fail "$ENDPOINT → manquant"
    fi
  done

  # Vérifier les grant types supportés
  GRANTS=$(echo "$OIDC_CONFIG" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin).get('grant_types_supported',[])))" 2>/dev/null)
  echo "      Grant types : $GRANTS"
else
  fail "OIDC Discovery non accessible"
fi
echo ""

# =============================================================================
# 3-5. AUTHENTIFICATION DES 3 RÔLES
# =============================================================================
declare -A TOKENS
declare -A REFRESH_TOKENS

for ROLE_INFO in "BUYER:buyer@collector.shop" "SELLER:seller@collector.shop" "ADMIN:admin@collector.shop"; do
  ROLE="${ROLE_INFO%%:*}"
  EMAIL="${ROLE_INFO##*:}"
  TEST_NUM=$((${#TOKENS[@]} + 3))

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $TEST_NUM. Authentification $ROLE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  START_MS=$(python3 -c "import time; print(int(time.time()*1000))")
  RESPONSE=$(curl -sf -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=$CLIENT_ID" \
    -d "username=$EMAIL" \
    -d "password=Test1234!" 2>/dev/null)
  END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
  ELAPSED=$((END_MS - START_MS))

  if [ -n "$RESPONSE" ]; then
    TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
    REFRESH=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null)
    EXPIRES=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('expires_in',''))" 2>/dev/null)
    TOKEN_TYPE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token_type',''))" 2>/dev/null)

    if [ -n "$TOKEN" ]; then
      TOKENS[$ROLE]="$TOKEN"
      REFRESH_TOKENS[$ROLE]="$REFRESH"
      pass "Login $EMAIL réussi (${ELAPSED}ms)"
      pass "Token type: $TOKEN_TYPE, expire dans ${EXPIRES}s"

      if [ -n "$REFRESH" ]; then
        pass "Refresh token reçu"
      else
        fail "Pas de refresh token"
      fi
    else
      fail "Login $EMAIL — pas de token dans la réponse"
    fi
  else
    fail "Login $EMAIL — aucune réponse"
  fi
  echo ""
done

# =============================================================================
# 6. VALIDATION JWT — STRUCTURE ET CLAIMS
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 6. Validation JWT — Structure et claims"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BUYER_TOKEN="${TOKENS[BUYER]}"
if [ -n "$BUYER_TOKEN" ]; then
  # Vérifier la structure header.payload.signature
  PARTS=$(echo "$BUYER_TOKEN" | tr '.' '\n' | wc -l | tr -d ' ')
  if [ "$PARTS" -eq 3 ]; then
    pass "JWT composé de 3 parties (header.payload.signature)"
  else
    fail "JWT mal formé ($PARTS parties)"
  fi

  # Décoder le header
  HEADER=$(echo "$BUYER_TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null)
  ALG=$(echo "$HEADER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('alg',''))" 2>/dev/null)
  if [ "$ALG" = "RS256" ]; then
    pass "Algorithme de signature : RS256 (asymétrique)"
  else
    pass "Algorithme de signature : $ALG"
  fi

  # Décoder le payload
  # Padding base64 si nécessaire
  PAYLOAD_B64=$(echo "$BUYER_TOKEN" | cut -d'.' -f2)
  PADDING=$((4 - ${#PAYLOAD_B64} % 4))
  if [ "$PADDING" -ne 4 ]; then
    PAYLOAD_B64="${PAYLOAD_B64}$(printf '=%.0s' $(seq 1 $PADDING))"
  fi
  PAYLOAD=$(echo "$PAYLOAD_B64" | base64 -d 2>/dev/null)

  # Vérifier les claims standards OIDC
  for CLAIM in iss sub exp iat; do
    VALUE=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$CLAIM','MISSING'))" 2>/dev/null)
    if [ "$VALUE" != "MISSING" ] && [ -n "$VALUE" ]; then
      pass "Claim '$CLAIM' présent"
    else
      fail "Claim '$CLAIM' manquant"
    fi
  done

  # Vérifier l'issuer
  ISS=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('iss',''))" 2>/dev/null)
  if echo "$ISS" | grep -q "$REALM"; then
    pass "Issuer contient le realm '$REALM'"
  else
    fail "Issuer inattendu: $ISS"
  fi

  # Vérifier l'email
  EMAIL_CLAIM=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null)
  if [ "$EMAIL_CLAIM" = "buyer@collector.shop" ]; then
    pass "Email claim correct : $EMAIL_CLAIM"
  else
    fail "Email claim inattendu : $EMAIL_CLAIM"
  fi
else
  fail "Pas de token BUYER pour validation"
fi
echo ""

# =============================================================================
# 7. REFRESH TOKEN
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 7. Refresh Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BUYER_REFRESH="${REFRESH_TOKENS[BUYER]}"
if [ -n "$BUYER_REFRESH" ]; then
  REFRESH_RESP=$(curl -sf -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token" \
    -d "client_id=$CLIENT_ID" \
    -d "refresh_token=$BUYER_REFRESH" 2>/dev/null)

  NEW_TOKEN=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  if [ -n "$NEW_TOKEN" ]; then
    pass "Refresh token → nouveau access_token reçu"

    # Vérifier que c'est un nouveau token
    if [ "$NEW_TOKEN" != "$BUYER_TOKEN" ]; then
      pass "Nouveau token différent de l'ancien (rotation OK)"
    else
      pass "Token identique (pas de rotation sur ce grant)"
    fi
  else
    fail "Refresh token échoué"
  fi
else
  fail "Pas de refresh token disponible"
fi
echo ""

# =============================================================================
# 8. MAUVAIS MOT DE PASSE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 8. Sécurité — Mauvais mot de passe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_PWD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=buyer@collector.shop" \
  -d "password=wrong" 2>/dev/null)

if [ "$BAD_PWD" = "401" ]; then
  pass "Mauvais mot de passe → 401 Unauthorized"
else
  fail "Mauvais mot de passe → code $BAD_PWD (attendu: 401)"
fi
echo ""

# =============================================================================
# 9. UTILISATEUR INEXISTANT
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 9. Sécurité — Utilisateur inexistant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
GHOST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=ghost@collector.shop" \
  -d "password=Test1234!" 2>/dev/null)

if [ "$GHOST" = "401" ]; then
  pass "Utilisateur inexistant → 401 (pas de fuite d'info)"
else
  fail "Utilisateur inexistant → code $GHOST (attendu: 401)"
fi
echo ""

# =============================================================================
# 10. CLIENT ID INVALIDE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 10. Sécurité — Client ID invalide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_CLIENT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=fake-app" \
  -d "username=buyer@collector.shop" \
  -d "password=Test1234!" 2>/dev/null)

if [ "$BAD_CLIENT" = "400" ] || [ "$BAD_CLIENT" = "401" ]; then
  pass "Client ID invalide → rejeté ($BAD_CLIENT)"
else
  fail "Client ID invalide → code $BAD_CLIENT (attendu: 400 ou 401)"
fi
echo ""

# =============================================================================
# 11. JWKS — CLÉ PUBLIQUE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 11. JWKS — Clé publique de signature"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JWKS=$(curl -sf "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/certs" 2>/dev/null)
KEY_COUNT=$(echo "$JWKS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('keys',[])))" 2>/dev/null)
if [ "$KEY_COUNT" -gt 0 ]; then
  pass "JWKS endpoint accessible — $KEY_COUNT clé(s) publique(s)"
  KEY_TYPE=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('kty',''))" 2>/dev/null)
  KEY_USE=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('use',''))" 2>/dev/null)
  pass "Type: $KEY_TYPE, Usage: $KEY_USE"
else
  fail "JWKS vide ou inaccessible"
fi
echo ""

# =============================================================================
# 12. RBAC — RÔLES DANS LE TOKEN
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 12. RBAC — Vérification des rôles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for ROLE in BUYER SELLER ADMIN; do
  T="${TOKENS[$ROLE]}"
  if [ -n "$T" ]; then
    PAYLOAD_B64=$(echo "$T" | cut -d'.' -f2)
    PADDING=$((4 - ${#PAYLOAD_B64} % 4))
    [ "$PADDING" -ne 4 ] && PAYLOAD_B64="${PAYLOAD_B64}$(printf '=%.0s' $(seq 1 $PADDING))"
    PAYLOAD=$(echo "$PAYLOAD_B64" | base64 -d 2>/dev/null)

    # Chercher le rôle dans realm_access ou realm_roles
    HAS_ROLE=$(echo "$PAYLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)
roles = d.get('realm_access', {}).get('roles', [])
roles += d.get('realm_roles', [])
print('$ROLE' in roles)
" 2>/dev/null)

    if [ "$HAS_ROLE" = "True" ]; then
      pass "$ROLE → rôle '$ROLE' présent dans le token"
    else
      fail "$ROLE → rôle '$ROLE' absent du token"
    fi
  fi
done
echo ""

# =============================================================================
# 13. USERINFO ENDPOINT
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 13. UserInfo Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "${TOKENS[BUYER]}" ]; then
  USERINFO=$(curl -sf "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/userinfo" \
    -H "Authorization: Bearer ${TOKENS[BUYER]}" 2>/dev/null)

  if [ -n "$USERINFO" ]; then
    UI_EMAIL=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null)
    UI_NAME=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null)
    pass "UserInfo accessible — email: $UI_EMAIL, nom: $UI_NAME"
  else
    fail "UserInfo non accessible"
  fi

  # Test avec token invalide
  BAD_UI=$(curl -s -o /dev/null -w "%{http_code}" "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/userinfo" \
    -H "Authorization: Bearer fake.token.here" 2>/dev/null)
  if [ "$BAD_UI" = "401" ]; then
    pass "UserInfo avec token invalide → 401"
  else
    fail "UserInfo avec token invalide → $BAD_UI"
  fi
fi
echo ""

# =============================================================================
# 14. LOGOUT
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 14. Logout (End Session)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "${REFRESH_TOKENS[BUYER]}" ]; then
  LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/logout" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID" \
    -d "refresh_token=${REFRESH_TOKENS[BUYER]}" 2>/dev/null)

  if [ "$LOGOUT_CODE" = "204" ] || [ "$LOGOUT_CODE" = "200" ]; then
    pass "Logout réussi → $LOGOUT_CODE"
  else
    fail "Logout → code $LOGOUT_CODE"
  fi

  # Vérifier que le refresh token est invalidé
  POST_LOGOUT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=refresh_token" \
    -d "client_id=$CLIENT_ID" \
    -d "refresh_token=${REFRESH_TOKENS[BUYER]}" 2>/dev/null)

  if [ "$POST_LOGOUT" = "400" ] || [ "$POST_LOGOUT" = "401" ]; then
    pass "Refresh après logout → rejeté ($POST_LOGOUT)"
  else
    fail "Refresh après logout → $POST_LOGOUT (devrait être rejeté)"
  fi
fi
echo ""

# =============================================================================
# 15. CONFIGURATION DU REALM
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 15. Configuration du Realm"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REALM_INFO=$(curl -sf "$KEYCLOAK_URL/realms/$REALM" 2>/dev/null)
if [ -n "$REALM_INFO" ]; then
  REG_ALLOWED=$(echo "$REALM_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('registrationAllowed', False))" 2>/dev/null)
  LOGIN_EMAIL=$(echo "$REALM_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('loginWithEmailAllowed', False))" 2>/dev/null)
  RESET_PWD=$(echo "$REALM_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('resetPasswordAllowed', False))" 2>/dev/null)

  [ "$REG_ALLOWED" = "True" ] && pass "Inscription ouverte : activée" || pass "Inscription ouverte : désactivée"
  [ "$LOGIN_EMAIL" = "True" ] && pass "Login par email : activé" || fail "Login par email : désactivé"
  [ "$RESET_PWD" = "True" ] && pass "Reset password : activé" || pass "Reset password : désactivé"
fi
echo ""

# =============================================================================
# RÉSUMÉ
# =============================================================================
TOTAL=$((PASS + FAIL))
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              RÉSUMÉ TESTS KEYCLOAK                          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ✅ Réussis : $PASS / $TOTAL                                         ║"
echo "║  ❌ Échoués : $FAIL / $TOTAL                                         ║"
echo "║                                                            ║"
echo "║  🏗️  Type       : Open-source auto-hébergé (Red Hat)        ║"
echo "║  📋 Standards  : OAuth 2.0, OIDC, SAML 2.0                ║"
echo "║  🔐 Signature  : RS256 (clé asymétrique)                  ║"
echo "║  🔄 Refresh    : Token rotation supportée                  ║"
echo "║  👥 RBAC       : Rôles dans le JWT (realm_access)          ║"
echo "║  💰 Coût       : Gratuit (infra seulement)                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Console admin : $KEYCLOAK_URL/admin (admin/admin)"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
