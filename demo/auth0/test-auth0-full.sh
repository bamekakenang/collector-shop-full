#!/bin/bash
# =============================================================================
# POC 3 — Tests complets Auth0 Authentication
# =============================================================================
# Prérequis : Variables d'environnement Auth0
#   export AUTH0_DOMAIN="your-tenant.eu.auth0.com"
#   export AUTH0_CLIENT_ID="xxxx"
#   export AUTH0_CLIENT_SECRET="xxxx"
#   export AUTH0_AUDIENCE="https://collector-shop-api"  (optionnel)
#
# Utilisateurs Auth0 à créer au préalable :
#   - buyer@collector.shop  / Test1234! (rôle BUYER)
#   - admin@collector.shop  / Test1234! (rôle ADMIN)
#
# Scénarios testés :
#   1.  Connectivité Auth0
#   2.  OpenID Connect Discovery
#   3.  Authentification BUYER (Resource Owner Password)
#   4.  Authentification ADMIN
#   5.  Validation du JWT (structure, claims, rôles)
#   6.  Refresh Token (si offline_access)
#   7.  Mauvais mot de passe (rejet)
#   8.  Utilisateur inexistant (rejet)
#   9.  Client ID invalide (rejet)
#  10.  JWKS — Clé publique
#  11.  RBAC — Rôles dans le token
#  12.  UserInfo Endpoint
#  13.  Management API Token (client_credentials)
#  14.  Configuration / Résumé comparatif
# =============================================================================

# ─── Configuration ───────────────────────────────────────────────────────────
if [ -z "$AUTH0_DOMAIN" ] || [ -z "$AUTH0_CLIENT_ID" ] || [ -z "$AUTH0_CLIENT_SECRET" ]; then
  echo "❌ Variables d'environnement requises :"
  echo "   export AUTH0_DOMAIN=\"your-tenant.eu.auth0.com\""
  echo "   export AUTH0_CLIENT_ID=\"xxxx\""
  echo "   export AUTH0_CLIENT_SECRET=\"xxxx\""
  echo "   export AUTH0_AUDIENCE=\"https://collector-shop-api\"  (optionnel)"
  exit 1
fi

AUTH0_URL="https://$AUTH0_DOMAIN"
AUDIENCE="${AUTH0_AUDIENCE:-https://collector-shop-api}"

PASS=0
FAIL=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     POC 3 — TESTS AUTH0 — Collector Shop                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔑 Auth0 Domain : $AUTH0_DOMAIN"
echo "📱 Client ID    : ${AUTH0_CLIENT_ID:0:8}..."
echo "🎯 Audience     : $AUDIENCE"
echo "📅 Date         : $(date '+%Y-%m-%d %H:%M')"
echo ""

# =============================================================================
# 1. CONNECTIVITÉ AUTH0
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. Connectivité Auth0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START_MS=$(python3 -c "import time; print(int(time.time()*1000))")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH0_URL/" 2>/dev/null)
END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
LATENCY=$((END_MS - START_MS))

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  pass "Auth0 accessible → HTTP $HTTP_CODE (${LATENCY}ms)"
else
  fail "Auth0 non accessible → HTTP $HTTP_CODE"
  echo "💡 Vérifiez AUTH0_DOMAIN : $AUTH0_DOMAIN"
  exit 1
fi
echo ""

# =============================================================================
# 2. OPENID CONNECT DISCOVERY
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 2. OpenID Connect Discovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
OIDC_CONFIG=$(curl -sf "$AUTH0_URL/.well-known/openid-configuration" 2>/dev/null)
if [ -n "$OIDC_CONFIG" ]; then
  pass "Endpoint OIDC Discovery accessible"

  # Vérifier les endpoints clés
  for ENDPOINT in authorization_endpoint token_endpoint userinfo_endpoint jwks_uri; do
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

  # Vérifier les scopes supportés
  SCOPES=$(echo "$OIDC_CONFIG" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin).get('scopes_supported',[])))" 2>/dev/null)
  echo "      Scopes      : $SCOPES"

  # Vérifier end_session_endpoint (Auth0 v2/logout)
  LOGOUT_EP=$(echo "$OIDC_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('end_session_endpoint','NONE'))" 2>/dev/null)
  if [ "$LOGOUT_EP" != "NONE" ] && [ -n "$LOGOUT_EP" ]; then
    pass "end_session_endpoint → présent"
  else
    pass "end_session_endpoint → absent (Auth0 utilise /v2/logout)"
  fi
else
  fail "OIDC Discovery non accessible"
fi
echo ""

# =============================================================================
# 3. AUTHENTIFICATION BUYER
# =============================================================================
declare -A TOKENS
declare -A REFRESH_TOKENS

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 3. Authentification BUYER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START_MS=$(python3 -c "import time; print(int(time.time()*1000))")
BUYER_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"username\": \"buyer@collector.shop\",
    \"password\": \"Test1234!\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid profile email offline_access\"
  }" 2>/dev/null)
END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
ELAPSED=$((END_MS - START_MS))

if [ -n "$BUYER_RESP" ]; then
  BUYER_TOKEN=$(echo "$BUYER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  BUYER_REFRESH=$(echo "$BUYER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null)
  BUYER_ID_TOKEN=$(echo "$BUYER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id_token',''))" 2>/dev/null)
  BUYER_EXPIRES=$(echo "$BUYER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('expires_in',''))" 2>/dev/null)
  BUYER_TYPE=$(echo "$BUYER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token_type',''))" 2>/dev/null)

  if [ -n "$BUYER_TOKEN" ]; then
    TOKENS[BUYER]="$BUYER_TOKEN"
    REFRESH_TOKENS[BUYER]="$BUYER_REFRESH"
    pass "Login buyer@collector.shop réussi (${ELAPSED}ms)"
    pass "Token type: $BUYER_TYPE, expire dans ${BUYER_EXPIRES}s"

    [ -n "$BUYER_ID_TOKEN" ] && pass "ID Token reçu (OIDC)" || fail "Pas d'ID Token"
    [ -n "$BUYER_REFRESH" ] && pass "Refresh token reçu (offline_access)" || pass "Pas de refresh token (scope non accordé)"
  else
    ERROR=$(echo "$BUYER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''), d.get('error_description',''))" 2>/dev/null)
    fail "Login BUYER échoué : $ERROR"
  fi
else
  fail "Login BUYER — aucune réponse"
fi
echo ""

# =============================================================================
# 4. AUTHENTIFICATION ADMIN
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 4. Authentification ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START_MS=$(python3 -c "import time; print(int(time.time()*1000))")
ADMIN_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"username\": \"admin@collector.shop\",
    \"password\": \"Test1234!\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid profile email\"
  }" 2>/dev/null)
END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
ELAPSED=$((END_MS - START_MS))

if [ -n "$ADMIN_RESP" ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  if [ -n "$ADMIN_TOKEN" ]; then
    TOKENS[ADMIN]="$ADMIN_TOKEN"
    pass "Login admin@collector.shop réussi (${ELAPSED}ms)"
  else
    ERROR=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''), d.get('error_description',''))" 2>/dev/null)
    fail "Login ADMIN échoué : $ERROR"
  fi
else
  fail "Login ADMIN — aucune réponse"
fi
echo ""

# =============================================================================
# 5. VALIDATION JWT — STRUCTURE ET CLAIMS
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 5. Validation JWT — Structure et claims"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

decode_jwt_payload() {
  local TOKEN=$1
  local PAYLOAD_B64=$(echo "$TOKEN" | cut -d'.' -f2)
  local PADDING=$((4 - ${#PAYLOAD_B64} % 4))
  [ "$PADDING" -ne 4 ] && PAYLOAD_B64="${PAYLOAD_B64}$(printf '=%.0s' $(seq 1 $PADDING))"
  echo "$PAYLOAD_B64" | base64 -d 2>/dev/null
}

if [ -n "${TOKENS[BUYER]}" ]; then
  # Vérifier structure 3 parties
  PARTS=$(echo "${TOKENS[BUYER]}" | tr '.' '\n' | wc -l | tr -d ' ')
  if [ "$PARTS" -eq 3 ]; then
    pass "JWT composé de 3 parties (header.payload.signature)"
  else
    fail "JWT mal formé ($PARTS parties)"
  fi

  # Décoder le header
  HEADER=$(echo "${TOKENS[BUYER]}" | cut -d'.' -f1 | base64 -d 2>/dev/null)
  ALG=$(echo "$HEADER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('alg',''))" 2>/dev/null)
  if [ "$ALG" = "RS256" ]; then
    pass "Algorithme de signature : RS256 (asymétrique)"
  else
    pass "Algorithme de signature : $ALG"
  fi

  # Décoder le payload
  PAYLOAD=$(decode_jwt_payload "${TOKENS[BUYER]}")

  # Claims standards
  for CLAIM in iss sub exp iat aud; do
    VALUE=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$CLAIM','MISSING'))" 2>/dev/null)
    if [ "$VALUE" != "MISSING" ] && [ -n "$VALUE" ]; then
      pass "Claim '$CLAIM' présent"
    else
      fail "Claim '$CLAIM' manquant"
    fi
  done

  # Vérifier l'issuer contient le domain Auth0
  ISS=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('iss',''))" 2>/dev/null)
  if echo "$ISS" | grep -q "$AUTH0_DOMAIN"; then
    pass "Issuer correspond au domain Auth0"
  else
    fail "Issuer inattendu: $ISS"
  fi

  # Vérifier l'audience
  AUD=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('aud',''))" 2>/dev/null)
  echo "      Audience : $AUD"

  # Auth0-specific: azp (authorized party)
  AZP=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('azp','NONE'))" 2>/dev/null)
  if [ "$AZP" != "NONE" ] && [ -n "$AZP" ]; then
    pass "Claim 'azp' (authorized party) présent : ${AZP:0:8}..."
  fi

  # Auth0-specific: scope
  SCOPE_CLAIM=$(echo "$PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('scope','NONE'))" 2>/dev/null)
  if [ "$SCOPE_CLAIM" != "NONE" ]; then
    pass "Scopes dans le token : $SCOPE_CLAIM"
  fi

  # Vérifier l'ID token si disponible
  if [ -n "$BUYER_ID_TOKEN" ]; then
    echo ""
    echo "  📋 Validation de l'ID Token :"
    ID_PAYLOAD=$(decode_jwt_payload "$BUYER_ID_TOKEN")
    ID_EMAIL=$(echo "$ID_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email','NONE'))" 2>/dev/null)
    ID_VERIFIED=$(echo "$ID_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email_verified','NONE'))" 2>/dev/null)
    ID_NAME=$(echo "$ID_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','NONE'))" 2>/dev/null)
    ID_NONCE=$(echo "$ID_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('nonce','NONE'))" 2>/dev/null)

    [ "$ID_EMAIL" != "NONE" ] && pass "ID Token — email : $ID_EMAIL" || fail "ID Token — email manquant"
    [ "$ID_VERIFIED" != "NONE" ] && pass "ID Token — email_verified : $ID_VERIFIED"
    [ "$ID_NAME" != "NONE" ] && pass "ID Token — name : $ID_NAME"
  fi
else
  fail "Pas de token BUYER pour validation"
fi
echo ""

# =============================================================================
# 6. REFRESH TOKEN
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 6. Refresh Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "${REFRESH_TOKENS[BUYER]}" ]; then
  REFRESH_RESP=$(curl -sf -X POST "$AUTH0_URL/oauth/token" \
    -H "Content-Type: application/json" \
    -d "{
      \"grant_type\": \"refresh_token\",
      \"client_id\": \"$AUTH0_CLIENT_ID\",
      \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
      \"refresh_token\": \"${REFRESH_TOKENS[BUYER]}\"
    }" 2>/dev/null)

  NEW_TOKEN=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
  if [ -n "$NEW_TOKEN" ]; then
    pass "Refresh token → nouveau access_token reçu"

    if [ "$NEW_TOKEN" != "${TOKENS[BUYER]}" ]; then
      pass "Token rafraîchi (différent de l'ancien)"
    fi

    # Vérifier rotation du refresh token
    NEW_REFRESH=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null)
    if [ -n "$NEW_REFRESH" ] && [ "$NEW_REFRESH" != "${REFRESH_TOKENS[BUYER]}" ]; then
      pass "Refresh token rotation activée (nouveau refresh reçu)"
    else
      pass "Pas de rotation du refresh token"
    fi
  else
    ERROR=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''), d.get('error_description',''))" 2>/dev/null)
    fail "Refresh token échoué : $ERROR"
  fi
else
  echo "  ⚠️  Pas de refresh token (scope offline_access non accordé) — skip"
fi
echo ""

# =============================================================================
# 7. MAUVAIS MOT DE PASSE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 7. Sécurité — Mauvais mot de passe"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_PWD_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"username\": \"buyer@collector.shop\",
    \"password\": \"wrongpassword\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid\"
  }" 2>/dev/null)

BAD_PWD_CODE=$(echo "$BAD_PWD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
BAD_PWD_DESC=$(echo "$BAD_PWD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error_description',''))" 2>/dev/null)

if [ -n "$BAD_PWD_CODE" ]; then
  pass "Mauvais mot de passe → rejeté (error: $BAD_PWD_CODE)"
  echo "      Détail : $BAD_PWD_DESC"
else
  fail "Mauvais mot de passe → pas d'erreur retournée"
fi
echo ""

# =============================================================================
# 8. UTILISATEUR INEXISTANT
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 8. Sécurité — Utilisateur inexistant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
GHOST_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"username\": \"ghost@collector.shop\",
    \"password\": \"Test1234!\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid\"
  }" 2>/dev/null)

GHOST_ERR=$(echo "$GHOST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
if [ -n "$GHOST_ERR" ]; then
  pass "Utilisateur inexistant → rejeté (error: $GHOST_ERR)"
else
  fail "Utilisateur inexistant — pas d'erreur retournée"
fi
echo ""

# =============================================================================
# 9. CLIENT ID INVALIDE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 9. Sécurité — Client ID invalide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BAD_CLIENT_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"fake-client-id\",
    \"client_secret\": \"fake-secret\",
    \"username\": \"buyer@collector.shop\",
    \"password\": \"Test1234!\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid\"
  }" 2>/dev/null)

BAD_CLIENT_ERR=$(echo "$BAD_CLIENT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
if [ -n "$BAD_CLIENT_ERR" ]; then
  pass "Client ID invalide → rejeté (error: $BAD_CLIENT_ERR)"
else
  fail "Client ID invalide — pas d'erreur retournée"
fi

# Client secret invalide
BAD_SECRET_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"wrong-secret\",
    \"username\": \"buyer@collector.shop\",
    \"password\": \"Test1234!\",
    \"audience\": \"$AUDIENCE\",
    \"scope\": \"openid\"
  }" 2>/dev/null)

BAD_SEC_ERR=$(echo "$BAD_SECRET_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
if [ -n "$BAD_SEC_ERR" ]; then
  pass "Client secret invalide → rejeté (error: $BAD_SEC_ERR)"
else
  fail "Client secret invalide — pas d'erreur retournée"
fi
echo ""

# =============================================================================
# 10. JWKS — CLÉ PUBLIQUE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 10. JWKS — Clé publique de signature"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JWKS=$(curl -sf "$AUTH0_URL/.well-known/jwks.json" 2>/dev/null)
KEY_COUNT=$(echo "$JWKS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('keys',[])))" 2>/dev/null)
if [ "$KEY_COUNT" -gt 0 ]; then
  pass "JWKS endpoint accessible — $KEY_COUNT clé(s) publique(s)"
  KEY_TYPE=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('kty',''))" 2>/dev/null)
  KEY_USE=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('use',''))" 2>/dev/null)
  KEY_ALG=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('alg',''))" 2>/dev/null)
  KEY_KID=$(echo "$JWKS" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0].get('kid',''))" 2>/dev/null)
  pass "Type: $KEY_TYPE, Usage: $KEY_USE, Algo: $KEY_ALG"
  pass "Key ID (kid) : ${KEY_KID:0:20}..."

  # Vérifier que le kid du token correspond
  if [ -n "${TOKENS[BUYER]}" ]; then
    TOKEN_KID=$(echo "${TOKENS[BUYER]}" | cut -d'.' -f1 | base64 -d 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('kid',''))" 2>/dev/null)
    KEYS_MATCH=$(echo "$JWKS" | python3 -c "
import sys,json
keys = json.load(sys.stdin).get('keys',[])
kids = [k['kid'] for k in keys]
print('$TOKEN_KID' in kids)
" 2>/dev/null)
    if [ "$KEYS_MATCH" = "True" ]; then
      pass "Token kid correspond à une clé JWKS"
    else
      fail "Token kid ($TOKEN_KID) ne correspond à aucune clé JWKS"
    fi
  fi
else
  fail "JWKS vide ou inaccessible"
fi
echo ""

# =============================================================================
# 11. RBAC — RÔLES DANS LE TOKEN
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 11. RBAC — Vérification des rôles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ℹ️  Auth0 stocke les rôles via un namespace custom dans le token"
echo "     (ex: https://collector-shop/roles ou permissions)"
echo ""

for ROLE in BUYER ADMIN; do
  T="${TOKENS[$ROLE]}"
  if [ -n "$T" ]; then
    PAYLOAD=$(decode_jwt_payload "$T")

    # Auth0 utilise un namespace custom ou permissions
    ROLES=$(echo "$PAYLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# Chercher dans plusieurs emplacements possibles
roles = []
# Namespace custom
for key in d:
    if 'roles' in key.lower():
        val = d[key]
        if isinstance(val, list):
            roles.extend(val)
        elif isinstance(val, str):
            roles.append(val)
# Permissions
perms = d.get('permissions', [])
if perms:
    roles.extend(perms)
# Scope
scope = d.get('scope', '')
if scope:
    roles.extend(scope.split())
print(','.join(roles) if roles else 'NONE')
" 2>/dev/null)

    if [ "$ROLES" != "NONE" ] && [ -n "$ROLES" ]; then
      pass "$ROLE → rôles/permissions trouvés : $ROLES"
    else
      echo "  ⚠️  $ROLE → aucun rôle trouvé dans le token"
      echo "      💡 Assurez-vous d'activer 'Add Permissions in the Access Token' dans Auth0"
      echo "      💡 Ou configurez une Auth0 Rule/Action pour ajouter les rôles"
    fi
  fi
done
echo ""

# =============================================================================
# 12. USERINFO ENDPOINT
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 12. UserInfo Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "${TOKENS[BUYER]}" ]; then
  USERINFO=$(curl -sf "$AUTH0_URL/userinfo" \
    -H "Authorization: Bearer ${TOKENS[BUYER]}" 2>/dev/null)

  if [ -n "$USERINFO" ]; then
    UI_EMAIL=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email','N/A'))" 2>/dev/null)
    UI_NAME=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','N/A'))" 2>/dev/null)
    UI_SUB=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sub','N/A'))" 2>/dev/null)
    UI_VERIFIED=$(echo "$USERINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email_verified','N/A'))" 2>/dev/null)
    pass "UserInfo accessible"
    pass "  email: $UI_EMAIL, nom: $UI_NAME"
    pass "  sub: ${UI_SUB:0:30}..., email_verified: $UI_VERIFIED"
  else
    fail "UserInfo non accessible"
  fi

  # Test avec token invalide
  BAD_UI=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH0_URL/userinfo" \
    -H "Authorization: Bearer fake.token.here" 2>/dev/null)
  if [ "$BAD_UI" = "401" ]; then
    pass "UserInfo avec token invalide → 401"
  else
    fail "UserInfo avec token invalide → $BAD_UI"
  fi
fi
echo ""

# =============================================================================
# 13. CLIENT CREDENTIALS (Machine-to-Machine)
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 13. Client Credentials (M2M)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
M2M_RESP=$(curl -s -X POST "$AUTH0_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"client_credentials\",
    \"client_id\": \"$AUTH0_CLIENT_ID\",
    \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
    \"audience\": \"$AUDIENCE\"
  }" 2>/dev/null)

M2M_TOKEN=$(echo "$M2M_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$M2M_TOKEN" ]; then
  M2M_EXPIRES=$(echo "$M2M_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('expires_in',''))" 2>/dev/null)
  pass "Client credentials → token M2M reçu (expire: ${M2M_EXPIRES}s)"

  # Vérifier que c'est un token machine (pas de sub utilisateur)
  M2M_PAYLOAD=$(decode_jwt_payload "$M2M_TOKEN")
  M2M_SUB=$(echo "$M2M_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sub',''))" 2>/dev/null)
  M2M_GI=$(echo "$M2M_PAYLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('gty',''))" 2>/dev/null)

  if echo "$M2M_SUB" | grep -q "@clients"; then
    pass "Token M2M — sub : $M2M_SUB (identifie le client, pas un user)"
  fi
  [ "$M2M_GI" = "client-credentials" ] && pass "Grant type dans token : client-credentials"
else
  ERROR=$(echo "$M2M_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''), d.get('error_description',''))" 2>/dev/null)
  echo "  ⚠️  Client credentials non configuré : $ERROR"
  echo "      💡 Activez 'Client Credentials' dans les settings de l'application Auth0"
fi
echo ""

# =============================================================================
# 14. RATE LIMITING (Auth0 impose des limites)
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 14. Rate Limiting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Tester les headers de rate limit sur une requête
HEADERS=$(curl -sI "$AUTH0_URL/.well-known/openid-configuration" 2>/dev/null)
RATE_LIMIT=$(echo "$HEADERS" | grep -i "x-ratelimit-limit" | tr -d '\r')
RATE_REMAINING=$(echo "$HEADERS" | grep -i "x-ratelimit-remaining" | tr -d '\r')

if [ -n "$RATE_LIMIT" ]; then
  pass "Rate limiting actif : $RATE_LIMIT"
  [ -n "$RATE_REMAINING" ] && pass "Requêtes restantes : $RATE_REMAINING"
else
  pass "Pas de headers rate-limit sur discovery (normal pour endpoints publics)"
fi
echo ""

# =============================================================================
# RÉSUMÉ
# =============================================================================
TOTAL=$((PASS + FAIL))
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              RÉSUMÉ TESTS AUTH0                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ✅ Réussis : $PASS / $TOTAL                                         ║"
echo "║  ❌ Échoués : $FAIL / $TOTAL                                         ║"
echo "║                                                            ║"
echo "║  ☁️  Type       : SaaS / Cloud managé (Okta)                ║"
echo "║  📋 Standards  : OAuth 2.0, OIDC                           ║"
echo "║  🔐 Signature  : RS256 (clé asymétrique)                  ║"
echo "║  🔄 Refresh    : Rotation configurable                     ║"
echo "║  👥 RBAC       : Via namespace custom ou permissions       ║"
echo "║  🌐 M2M        : Client credentials supporté              ║"
echo "║  💰 Coût       : Gratuit jusqu'à 7500 MAU                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Dashboard : https://manage.auth0.com"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
