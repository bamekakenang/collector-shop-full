#!/bin/bash
# =============================================================================
# Smoke Tests Infrastructure — POC Collector Shop
# =============================================================================
# Vérifie que le déploiement AKS est fonctionnel :
#   1. Résolution DNS
#   2. Certificat HTTPS valide
#   3. Health check API
#   4. Pages frontend accessibles
#   5. Routes /api et /uploads proxiées
#   6. Redirection HTTP → HTTPS
#   7. État des pods Kubernetes
#   8. Certificat TLS cert-manager
# =============================================================================

DOMAIN="collector-shop.swedencentral.cloudapp.azure.com"
NAMESPACE="collector-shop"
PASS=0
FAIL=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       SMOKE TESTS INFRASTRUCTURE — Collector Shop           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Domaine : $DOMAIN"
echo "📅 Date    : $(date '+%Y-%m-%d %H:%M')"
echo ""

# ================================================================
# 1. RÉSOLUTION DNS
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. Résolution DNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
IP=$(dig +short "$DOMAIN" 2>/dev/null || nslookup "$DOMAIN" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
if [ -n "$IP" ]; then
  pass "DNS résout vers $IP"
else
  fail "DNS ne résout pas"
fi
echo ""

# ================================================================
# 2. CERTIFICAT HTTPS
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 2. Certificat HTTPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates -issuer 2>/dev/null)
if echo "$CERT_INFO" | grep -q "Let's Encrypt"; then
  pass "Certificat Let's Encrypt valide"
  echo "$CERT_INFO" | sed 's/^/      /'
elif echo "$CERT_INFO" | grep -q "notAfter"; then
  pass "Certificat TLS présent"
  echo "$CERT_INFO" | sed 's/^/      /'
else
  fail "Pas de certificat HTTPS valide"
fi
echo ""

# ================================================================
# 3. REDIRECTION HTTP → HTTPS
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 3. Redirection HTTP → HTTPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$DOMAIN/" 2>/dev/null)
if [ "$HTTP_CODE" = "308" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  pass "HTTP redirige vers HTTPS (code $HTTP_CODE)"
else
  fail "HTTP ne redirige pas (code $HTTP_CODE)"
fi
echo ""

# ================================================================
# 4. HEALTH CHECK API
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 4. Health Check API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -sf --connect-timeout 10 "https://$DOMAIN/api/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"ok"'; then
  pass "GET /api/health → 200 OK"
else
  fail "GET /api/health échoue"
fi
echo ""

# ================================================================
# 5. FRONTEND ACCESSIBLE
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 5. Frontend accessible"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FRONTEND=$(curl -sf --connect-timeout 10 "https://$DOMAIN/" 2>/dev/null)
if echo "$FRONTEND" | grep -q "<!DOCTYPE html>"; then
  pass "GET / → page HTML servie"
else
  fail "GET / → pas de réponse HTML"
fi
echo ""

# ================================================================
# 6. API PRODUITS
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 6. API Produits"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PRODUCTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN/api/products" 2>/dev/null)
if [ "$PRODUCTS_CODE" = "200" ]; then
  pass "GET /api/products → 200"
else
  fail "GET /api/products → $PRODUCTS_CODE"
fi
echo ""

# ================================================================
# 7. ROUTE UPLOADS PROXIÉE
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 7. Route /uploads proxiée"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
UPLOADS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN/uploads/" 2>/dev/null)
if [ "$UPLOADS_CODE" != "000" ] && [ "$UPLOADS_CODE" != "502" ]; then
  pass "GET /uploads/ → réponse backend ($UPLOADS_CODE)"
else
  fail "GET /uploads/ → pas de réponse ($UPLOADS_CODE)"
fi
echo ""

# ================================================================
# 8. PODS KUBERNETES
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 8. État des pods Kubernetes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v kubectl &> /dev/null; then
  RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running")
  TOTAL=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RUNNING" -ge 2 ]; then
    pass "$RUNNING/$TOTAL pods Running"
  else
    fail "Seulement $RUNNING/$TOTAL pods Running"
  fi

  kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | sed 's/^/      /'
else
  echo "  ⚠️  kubectl non disponible"
fi
echo ""

# ================================================================
# 9. CERTIFICAT CERT-MANAGER
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 9. Certificat cert-manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v kubectl &> /dev/null; then
  CERT_READY=$(kubectl get certificate -n "$NAMESPACE" --no-headers 2>/dev/null | awk '{print $2}')
  if [ "$CERT_READY" = "True" ]; then
    pass "Certificate collector-tls READY"
  else
    fail "Certificate collector-tls NOT READY ($CERT_READY)"
  fi
  kubectl get certificate -n "$NAMESPACE" 2>/dev/null | sed 's/^/      /'
else
  echo "  ⚠️  kubectl non disponible"
fi
echo ""

# ================================================================
# RÉSUMÉ
# ================================================================
TOTAL=$((PASS + FAIL))
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      RÉSUMÉ                                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ✅ Réussis : $PASS / $TOTAL                                       ║"
echo "║  ❌ Échoués : $FAIL / $TOTAL                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
