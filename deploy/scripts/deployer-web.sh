#!/usr/bin/env bash
# Construit le front (dist/) avec les variables de production, puis (re)démarre
# le nginx qui le sert et qui filtre l'accès public à l'API Supabase.
#
# Usage (sur la VM, depuis n'importe quel dossier) :
#   bash deploy/scripts/deployer-web.sh
#
# Les variables VITE_* sont FIGÉES dans le JavaScript à la compilation : changer
# de domaine ou de clé impose de relancer ce script. Elles sont lues dans
# .env.production (racine du dépôt), créé au premier passage à partir du .env de
# la pile Supabase :
#   VITE_SUPABASE_URL             ← SUPABASE_PUBLIC_URL
#   VITE_SUPABASE_PUBLISHABLE_KEY ← ANON_KEY  (JWT « anon » : c'est la clé publique
#                                   de la pile autohébergée ; le format
#                                   sb_publishable_ est propre au cloud)
#   VITE_PUBLIC_APP_URL           ← PUBLIC_APP_URL (contenu des QR codes)
#
# Mise à jour de l'application : git pull puis relancer ce script. dist/ est monté
# dans le conteneur : pas besoin de le redémarrer.
#
# Variables : SUPABASE_DIR (défaut /opt/supabase), HELPDESK_REPO (défaut : ce dépôt).

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPDESK_REPO="${HELPDESK_REPO:-$(cd "$ICI/../.." && pwd)}"

cd "$HELPDESK_REPO"

if [ ! -f .env.production ]; then
  [ -f "$SUPABASE_DIR/.env" ] || { echo "Ni .env.production ni $SUPABASE_DIR/.env : lancez installer-supabase.sh d'abord." >&2; exit 1; }
  lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }
  echo "→ Création de .env.production depuis la pile"
  {
    echo "# Variables de production du front, générées par deploy/scripts/deployer-web.sh."
    echo "# Ignoré par Git. Modifiez puis relancez le script pour reconstruire."
    echo "VITE_SUPABASE_URL=$(lire_env SUPABASE_PUBLIC_URL)"
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=$(lire_env ANON_KEY)"
    echo "VITE_PUBLIC_APP_URL=$(lire_env PUBLIC_APP_URL)"
  } > .env.production
fi

# Garde-fou : une clé secrète dans une variable VITE_ finirait dans le navigateur,
# et contourne toutes les politiques RLS. On décode la charge du JWT pour vérifier
# le rôle (base64url sans remplissage → on le rajoute avant base64 -d).
cle="$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' .env.production | cut -d= -f2-)"
charge="$(printf '%s' "$cle" | cut -d. -f2 | tr '_-' '/+')"
reste=$(( (4 - ${#charge} % 4) % 4 ))
charge="$charge$(printf '%*s' "$reste" '' | tr ' ' '=')"
if printf '%s' "$cle" | grep -q '^sb_secret_' \
   || printf '%s' "$charge" | base64 -d 2>/dev/null | grep -q '"role" *: *"service_role"'; then
  echo "REFUS : .env.production contient une clé de service. Utilisez ANON_KEY (rôle anon)." >&2
  exit 1
fi

echo "→ Variables de build :"
grep '^VITE_' .env.production | sed 's/\(PUBLISHABLE_KEY=\).\{12\}.*/\1…/'

echo "→ Installation des dépendances et build"
npm ci --no-audit --no-fund
npm run build

echo "→ Démarrage du nginx"
docker network inspect supabase_default >/dev/null 2>&1 \
  || { echo "Réseau supabase_default absent : la pile Supabase doit tourner." >&2; exit 1; }
docker compose -f deploy/web/docker-compose.yml up -d

echo
echo "Front déployé. Depuis la VM :"
echo "  curl -s http://127.0.0.1:8080/ | grep -o '<title>[^<]*'"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/          # attendu : 404"
echo
echo "Étape suivante : les deux proxy hosts dans Nginx Proxy Manager (docs/07-autohebergement.md § 8)."
