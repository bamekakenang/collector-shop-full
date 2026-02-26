#!/bin/bash
# =============================================================================
# COMPARAISON POC 2 (Keycloak) vs POC 3 (Auth0) — Collector Shop
# =============================================================================
# Ce script lance les tests des deux POC et affiche un tableau comparatif
# pour la soutenance.
#
# Prérequis :
#   - Docker running (pour Keycloak)
#   - Variables Auth0 exportées (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║    COMPARAISON POC — Keycloak vs Auth0 — Collector Shop             ║"
echo "║    Soutenance Bloc 3                                                ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📅 Date : $(date '+%Y-%m-%d %H:%M')"
echo ""

# =============================================================================
# TABLEAU COMPARATIF STATIQUE (pour la soutenance)
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 COMPARAISON ARCHITECTURALE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "┌────────────────────────┬─────────────────────────┬─────────────────────────┐"
echo "│ Critère                │ POC 2 — Keycloak        │ POC 3 — Auth0           │"
echo "├────────────────────────┼─────────────────────────┼─────────────────────────┤"
echo "│ Type                   │ Open-source (Red Hat)   │ SaaS (Okta)             │"
echo "│ Hébergement            │ Auto-hébergé (Docker)   │ Cloud managé            │"
echo "│ Standards              │ OAuth2, OIDC, SAML 2.0  │ OAuth2, OIDC            │"
echo "│ Signature JWT          │ RS256 (asymétrique)     │ RS256 (asymétrique)     │"
echo "│ RBAC                   │ realm_access.roles      │ Namespace custom        │"
echo "│ Refresh Token          │ Oui (intégré)           │ Oui (offline_access)    │"
echo "│ Token Rotation         │ Configurable            │ Configurable            │"
echo "│ M2M (Client Cred.)     │ Oui                     │ Oui                     │"
echo "│ UserInfo Endpoint      │ Oui                     │ Oui                     │"
echo "│ JWKS Endpoint          │ Oui                     │ Oui                     │"
echo "│ Logout                 │ End session + invalidate│ /v2/logout (redirect)   │"
echo "│ Console Admin          │ Incluse (web)           │ Dashboard cloud         │"
echo "│ Customisation UI       │ Themes FreeMarker       │ Universal Login         │"
echo "│ Social Login           │ Extensions manuelles    │ Intégré (30+ providers) │"
echo "│ MFA                    │ Intégré                 │ Intégré (Guardian)      │"
echo "│ Brute Force Protect    │ Configurable            │ Intégré automatique     │"
echo "│ Rate Limiting          │ Manuel (reverse proxy)  │ Intégré (headers)       │"
echo "│ SAML 2.0               │ ✅ Natif                │ ❌ Non supporté          │"
echo "│ Coût                   │ Gratuit (infra only)    │ Gratuit < 7500 MAU      │"
echo "│ Temps de mise en place │ ~30 min (Docker)        │ ~15 min (Dashboard)     │"
echo "│ Maintenance            │ Manuelle (mises à jour) │ Aucune (SaaS)           │"
echo "│ Latence                │ Locale (~10-50ms)       │ Réseau (~100-300ms)     │"
echo "│ RGPD / Data Residency  │ Total control           │ Dépend de la région     │"
echo "└────────────────────────┴─────────────────────────┴─────────────────────────┘"
echo ""

# =============================================================================
# TESTS DYNAMIQUES (si les services sont dispo)
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 TESTS DYNAMIQUES — Latence d'authentification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Test Keycloak ───────────────────────────────────────────────────────
KC_URL="http://localhost:8180"
KC_AVAILABLE=false
KC_LATENCY="N/A"
KC_OIDC_LATENCY="N/A"

if curl -sf "$KC_URL/realms/master" > /dev/null 2>&1; then
  KC_AVAILABLE=true
  echo "📦 Keycloak : disponible"

  # Mesurer la latence d'auth
  START=$(python3 -c "import time; print(int(time.time()*1000))")
  KC_RESP=$(curl -sf -X POST "$KC_URL/realms/collector-shop/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=collector-shop-app&username=buyer@collector.shop&password=Test1234!" 2>/dev/null)
  END=$(python3 -c "import time; print(int(time.time()*1000))")
  KC_LATENCY="$((END - START))ms"

  if [ -n "$KC_RESP" ]; then
    echo "  ✅ Auth latence : $KC_LATENCY"
  else
    echo "  ❌ Auth échouée"
  fi

  # Mesurer la latence OIDC discovery
  START=$(python3 -c "import time; print(int(time.time()*1000))")
  curl -sf "$KC_URL/realms/collector-shop/.well-known/openid-configuration" > /dev/null 2>&1
  END=$(python3 -c "import time; print(int(time.time()*1000))")
  KC_OIDC_LATENCY="$((END - START))ms"
  echo "  ✅ OIDC Discovery latence : $KC_OIDC_LATENCY"
else
  echo "📦 Keycloak : non disponible (docker compose up -d dans demo/keycloak/)"
fi
echo ""

# ─── Test Auth0 ──────────────────────────────────────────────────────────
A0_AVAILABLE=false
A0_LATENCY="N/A"
A0_OIDC_LATENCY="N/A"

if [ -n "$AUTH0_DOMAIN" ]; then
  A0_URL="https://$AUTH0_DOMAIN"
  if curl -sf "$A0_URL/.well-known/openid-configuration" > /dev/null 2>&1; then
    A0_AVAILABLE=true
    echo "☁️  Auth0 : disponible ($AUTH0_DOMAIN)"

    # Mesurer la latence d'auth
    START=$(python3 -c "import time; print(int(time.time()*1000))")
    A0_RESP=$(curl -sf -X POST "$A0_URL/oauth/token" \
      -H "Content-Type: application/json" \
      -d "{
        \"grant_type\": \"password\",
        \"client_id\": \"$AUTH0_CLIENT_ID\",
        \"client_secret\": \"$AUTH0_CLIENT_SECRET\",
        \"username\": \"buyer@collector.shop\",
        \"password\": \"Test1234!\",
        \"audience\": \"${AUTH0_AUDIENCE:-https://collector-shop-api}\",
        \"scope\": \"openid\"
      }" 2>/dev/null)
    END=$(python3 -c "import time; print(int(time.time()*1000))")
    A0_LATENCY="$((END - START))ms"

    if [ -n "$A0_RESP" ]; then
      echo "  ✅ Auth latence : $A0_LATENCY"
    else
      echo "  ❌ Auth échouée (vérifiez les credentials)"
    fi

    # Mesurer la latence OIDC discovery
    START=$(python3 -c "import time; print(int(time.time()*1000))")
    curl -sf "$A0_URL/.well-known/openid-configuration" > /dev/null 2>&1
    END=$(python3 -c "import time; print(int(time.time()*1000))")
    A0_OIDC_LATENCY="$((END - START))ms"
    echo "  ✅ OIDC Discovery latence : $A0_OIDC_LATENCY"
  else
    echo "☁️  Auth0 : non accessible ($AUTH0_DOMAIN)"
  fi
else
  echo "☁️  Auth0 : non configuré (export AUTH0_DOMAIN=...)"
fi
echo ""

# ─── Tableau des latences ────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  RÉSUMÉ LATENCES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "┌──────────────────────┬──────────────┬──────────────┐"
echo "│ Opération            │ Keycloak     │ Auth0        │"
echo "├──────────────────────┼──────────────┼──────────────┤"
printf "│ %-20s │ %-12s │ %-12s │\n" "Login (password)" "$KC_LATENCY" "$A0_LATENCY"
printf "│ %-20s │ %-12s │ %-12s │\n" "OIDC Discovery" "$KC_OIDC_LATENCY" "$A0_OIDC_LATENCY"
echo "└──────────────────────┴──────────────┴──────────────┘"
echo ""

# =============================================================================
# CONCLUSION POUR LA SOUTENANCE
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 CONCLUSION — Recommandation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🏆 POC 1 (JWT Custom)  : Simple, rapide, contrôle total"
echo "     → Adapté pour : MVP, projets internes, équipe maîtrisant la sécurité"
echo ""
echo "  🏰 POC 2 (Keycloak)   : Complet, standards complets (OIDC+SAML)"
echo "     → Adapté pour : Entreprise, on-premise, conformité RGPD stricte"
echo "     → Avantage    : Gratuit, pas de vendor lock-in"
echo ""
echo "  ☁️  POC 3 (Auth0)      : Rapide à intégrer, SaaS managé"
echo "     → Adapté pour : Startup, time-to-market court, social login"
echo "     → Avantage    : Zéro maintenance, 30+ providers sociaux intégrés"
echo ""
echo "  📊 Pour Collector Shop : Keycloak recommandé"
echo "     → Contrôle des données utilisateurs (RGPD)"
echo "     → SAML 2.0 si intégration enterprise future"
echo "     → Pas de coût par utilisateur"
echo ""

# Lancer les tests complets si demandé
if [ "$1" = "--run-all" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 Lancement des tests complets"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if $KC_AVAILABLE; then
    echo ""
    echo "═══ TESTS KEYCLOAK ═══"
    bash "$SCRIPT_DIR/keycloak/test-keycloak-full.sh"
  fi

  if $A0_AVAILABLE; then
    echo ""
    echo "═══ TESTS AUTH0 ═══"
    bash "$SCRIPT_DIR/auth0/test-auth0-full.sh"
  fi
fi
