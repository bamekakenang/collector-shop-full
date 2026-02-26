#!/bin/bash
# ================================================================
# POC 1 — Expérimentation CI/CD : GitHub Actions vs GitLab CI
# ================================================================
# Ce script compare les deux solutions CI/CD en analysant :
# 1. La structure des pipelines
# 2. Les derniers runs et leur statut
# 3. Les temps d'exécution
# 4. Les fonctionnalités (stages, jobs, artefacts)
# ================================================================

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   POC 1 — COMPARAISON CI/CD : GitHub Actions vs GitLab CI  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Projet : collector-shop-full"
echo "📅 Date   : $(date '+%Y-%m-%d %H:%M')"
echo ""

# ================================================================
# ÉTAPE 1 : Analyse de la structure des pipelines
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÉTAPE 1 : Structure des Pipelines"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🟣 GITHUB ACTIONS (.github/workflows/ci.yml)"
echo "   ├── Déclencheurs : push main, pull_request main"
echo "   ├── Jobs parallèles :"
GHA_JOBS=$(grep -c "^\s\s[a-z].*:" "$REPO_DIR/.github/workflows/ci.yml" 2>/dev/null || echo "?")
echo "   │   └── $GHA_JOBS jobs détectés"
echo "   ├── Jobs :"
grep "^\s\s[a-z].*:$" "$REPO_DIR/.github/workflows/ci.yml" 2>/dev/null | sed 's/://;s/^  /   │   ├── /'
echo "   ├── Tests : npm test, npm audit, typecheck"
echo "   ├── Sécurité : Trivy scan, Dependency Review"
echo "   ├── Registry : GHCR (ghcr.io)"
echo "   └── Deploy : sed + git push (GitOps)"
echo ""

echo "🟠 GITLAB CI (.gitlab-ci.yml)"
echo "   ├── Déclencheurs : push main, merge_request"
echo "   ├── Stages séquentiels :"
GITLAB_STAGES=$(grep "^  - " "$REPO_DIR/.gitlab-ci.yml" 2>/dev/null | head -5)
echo "$GITLAB_STAGES" | sed 's/^  - /   │   ├── /'
GITLAB_JOBS=$(grep -c "^[a-z].*:" "$REPO_DIR/.gitlab-ci.yml" 2>/dev/null || echo "?")
echo "   ├── $GITLAB_JOBS jobs détectés"
echo "   ├── Tests : npm test, npm audit, typecheck"
echo "   ├── Sécurité : Trivy scan"
echo "   ├── Registry : GitLab Container Registry"
echo "   └── Deploy : sed + git push (GitOps)"
echo ""

# ================================================================
# ÉTAPE 2 : Comparaison des fichiers de configuration
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÉTAPE 2 : Taille et complexité des fichiers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GHA_LINES=$(wc -l < "$REPO_DIR/.github/workflows/ci.yml" 2>/dev/null | tr -d ' ')
GLC_LINES=$(wc -l < "$REPO_DIR/.gitlab-ci.yml" 2>/dev/null | tr -d ' ')

echo "   🟣 GitHub Actions : $GHA_LINES lignes"
echo "   🟠 GitLab CI      : $GLC_LINES lignes"
echo ""
echo "   📊 Observation : GitLab CI nécessite plus de configuration"
echo "      (Docker-in-Docker, artefacts .tar, cache explicite)"
echo ""

# ================================================================
# ÉTAPE 3 : Vérification GitHub Actions (via gh CLI)
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÉTAPE 3 : Derniers runs GitHub Actions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v gh &> /dev/null; then
  echo "🟣 GitHub Actions — 5 derniers runs :"
  echo ""
  gh run list --repo bamekakenang/collector-shop-full --limit 5 2>/dev/null || echo "   ⚠️  Impossible de récupérer les runs (vérifiez gh auth)"
  echo ""
else
  echo "   ⚠️  gh CLI non installé — vérifiez manuellement sur :"
  echo "   🔗 https://github.com/bamekakenang/collector-shop-full/actions"
  echo ""
fi

# ================================================================
# ÉTAPE 4 : Vérification GitLab CI (via API)
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÉTAPE 4 : Derniers pipelines GitLab CI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GITLAB_PROJECT="bamekakenang0-group%2Fcollector-shop-full"
GITLAB_API="https://gitlab.com/api/v4/projects/$GITLAB_PROJECT/pipelines"

PIPELINES=$(curl -sf "$GITLAB_API?per_page=5" 2>/dev/null)

if [ -n "$PIPELINES" ] && [ "$PIPELINES" != "[]" ]; then
  echo "🟠 GitLab CI — 5 derniers pipelines :"
  echo ""
  echo "$PIPELINES" | python3 -c "
import sys, json
pipelines = json.load(sys.stdin)
for p in pipelines:
    status = '✅' if p['status'] == 'success' else '⚠️' if p['status'] == 'warning' else '❌' if p['status'] == 'failed' else '🔄'
    print(f\"   {status} Pipeline #{p['id']} — {p['status']} — {p['ref']} — {p['created_at'][:16]}\")
" 2>/dev/null
  echo ""
else
  echo "   ⚠️  Impossible de récupérer les pipelines GitLab"
  echo "   🔗 https://gitlab.com/bamekakenang0-group/collector-shop-full/-/pipelines"
  echo ""
fi

# ================================================================
# ÉTAPE 5 : Comparaison des fonctionnalités
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ÉTAPE 5 : Comparaison des fonctionnalités"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Fonctionnalité              │ GitHub Actions  │ GitLab CI"
echo "   ────────────────────────────┼─────────────────┼──────────────"
echo "   Fichier config              │ YAML (ci.yml)   │ YAML (.gitlab-ci.yml)"
echo "   Exécution jobs              │ Parallèle       │ Par stage (séquentiel)"
echo "   Registry Docker intégré     │ GHCR             │ GitLab Registry"
echo "   Runners gratuits            │ 2000 min/mois   │ 400 min/mois"
echo "   Docker-in-Docker            │ Natif            │ Service DinD requis"
echo "   Dependency Review (PR)      │ ✅ Action native │ ⚠️ npm audit manuel"
echo "   Scan sécurité (Trivy)       │ ✅ Action         │ ✅ Image Trivy"
echo "   Artefacts entre jobs        │ actions/upload   │ artifacts: paths:"
echo "   Cache dépendances           │ actions/cache    │ cache: key/paths"
echo "   GitOps (update manifests)   │ ✅                │ ✅"
echo "   Marketplace / Intégrations  │ 15000+ actions  │ Templates limités"
echo ""

# ================================================================
# SYNTHÈSE
# ================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SYNTHÈSE POC CI/CD                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  🟣 GitHub Actions                                         ║"
echo "║     + Jobs parallèles → pipeline plus rapide               ║"
echo "║     + Marketplace riche (15000+ actions)                   ║"
echo "║     + 2000 min/mois gratuites                              ║"
echo "║     + Intégration native GitHub (code déjà sur GitHub)     ║"
echo "║     - Pas de DAG natif entre jobs                          ║"
echo "║                                                            ║"
echo "║  🟠 GitLab CI                                              ║"
echo "║     + Stages séquentiels clairs et lisibles                ║"
echo "║     + Registry Docker intégré au projet                    ║"
echo "║     + Runners self-hosted illimités                        ║"
echo "║     + Review Apps et Auto DevOps                           ║"
echo "║     - Docker-in-Docker ajoute de la complexité             ║"
echo "║     - 400 min/mois gratuites seulement                    ║"
echo "║                                                            ║"
echo "║  ⚖️  Recommandation : GitHub Actions                       ║"
echo "║     → Code déjà hébergé sur GitHub                         ║"
echo "║     → Pipeline fonctionnel et plus rapide                  ║"
echo "║     → Marketplace plus riche pour l'extensibilité          ║"
echo "║                                                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
