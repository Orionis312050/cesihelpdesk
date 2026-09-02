#!/usr/bin/env bash
# Installe la pile Supabase autohébergée pour CESI Helpdesk.
#
#   1. clone épinglé du dossier docker/ du dépôt supabase/supabase (tag SUPABASE_REF) ;
#   2. .env : modèle amont + secrets générés par l'outil amont + URL publiques +
#      réglages Helpdesk (inscription fermée, e-mails auto-confirmés…) ;
#   3. surcouche deploy/supabase-overlay/docker-compose.helpdesk.yml ;
#   4. démarrage de la pile.
#
# Usage :
#   bash deploy/scripts/installer-supabase.sh [domaine]
#
# Un seul nom de domaine (défaut helpdesk.cesilarochelle.fr) : l'application et
# l'API Supabase sont servies sous le même nom, NPM routant /auth, /rest,
# /storage, /functions et /realtime vers le port 8000 de la VM (docs/07 § 6).
#
# Variables facultatives :
#   SUPABASE_DIR   où installer la pile            (défaut /opt/supabase)
#   HELPDESK_REPO  racine du dépôt de l'application (défaut : ce dépôt)
#   SUPABASE_REF   tag amont à cloner              (défaut self-hosted/v0.8.0)
#
# Relançable : ne réécrit ni un .env existant ni les clés ; recopie la surcouche
# et redémarre ce qui a changé.

set -euo pipefail

SUPABASE_REF="${SUPABASE_REF:-self-hosted/v0.8.0}"
SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPDESK_REPO="${HELPDESK_REPO:-$(cd "$ICI/../.." && pwd)}"
OVERLAY="$ICI/../supabase-overlay"

domaine="${1:-helpdesk.cesilarochelle.fr}"
echo "→ Application et API sous https://$domaine"

for outil in git docker openssl; do
  command -v "$outil" >/dev/null || { echo "Outil manquant : $outil (lancez installer-vm.sh)." >&2; exit 1; }
done

# `!override` dans la surcouche demande Compose >= 2.24.
version_compose="$(docker compose version --short | sed 's/^v//')"
if [ "$(printf '%s\n2.24.0\n' "$version_compose" | sort -V | head -n1)" != "2.24.0" ]; then
  echo "Docker Compose $version_compose trop ancien : 2.24 minimum (installer-vm.sh installe le dépôt officiel)." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Clone épinglé
# ---------------------------------------------------------------------------
if [ -f "$SUPABASE_DIR/docker-compose.yml" ]; then
  echo "→ Pile déjà présente dans $SUPABASE_DIR ($(grep '^ref=' "$SUPABASE_DIR/.supabase-version" 2>/dev/null || echo 'version inconnue'))"
else
  echo "→ Récupération de supabase/supabase@$SUPABASE_REF (dossier docker/ seulement)"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  git clone --quiet --depth 1 --filter=blob:none --sparse --branch "$SUPABASE_REF" \
    https://github.com/supabase/supabase "$tmp/supabase"
  git -C "$tmp/supabase" sparse-checkout set --no-cone docker >/dev/null
  mkdir -p "$SUPABASE_DIR"
  cp -a "$tmp/supabase/docker/." "$SUPABASE_DIR/"
  # Même format que setup.sh amont : permet à `sh update.sh` de savoir d'où partir.
  {
    echo "# Supabase self-hosted version stamp. Managed by setup.sh / update.sh."
    echo "# Do not commit or edit by hand. Records the ref this deployment was based on."
    echo "ref=$SUPABASE_REF"
  } > "$SUPABASE_DIR/.supabase-version"
fi

cd "$SUPABASE_DIR"

# ---------------------------------------------------------------------------
# 2. .env
# ---------------------------------------------------------------------------
# Remplace la valeur d'une clé existante, ou l'ajoute en fin de fichier.
regler() {
  if grep -q "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

if [ -f .env ]; then
  echo "→ .env déjà présent : clés et URL conservées"
else
  echo "→ Création du .env et génération des secrets"
  cp .env.example .env
  sh utils/generate-keys.sh --update-env >/dev/null
  rm -f .env.old
  cat "$OVERLAY/helpdesk.env.example" >> .env

  # Surcouche empilée sur le compose amont.
  regler COMPOSE_FILE "docker-compose.yml:docker-compose.helpdesk.yml"

  # URL publiques (via Nginx Proxy Manager) : même nom pour le front et l'API.
  # API_EXTERNAL_URL est l'URL complète du service Auth, chemin /auth/v1 compris —
  # c'est le format attendu en amont.
  regler SUPABASE_PUBLIC_URL "https://$domaine"
  regler API_EXTERNAL_URL "https://$domaine/auth/v1"
  regler SITE_URL "https://$domaine"
  regler ADDITIONAL_REDIRECT_URLS "https://$domaine"

  # SÉCURITÉ — inscription fermée. Le déclencheur gerer_nouvel_utilisateur() lit
  # le rôle dans les métadonnées fournies par le client : avec l'inscription
  # ouverte, n'importe qui pourrait se créer un compte admin. Les comptes se
  # créent avec creer-compte-admin.sh (clé de service, depuis la VM).
  regler DISABLE_SIGNUP "true"
  regler ENABLE_EMAIL_AUTOCONFIRM "true"
  regler ENABLE_PHONE_SIGNUP "false"
  regler ENABLE_PHONE_AUTOCONFIRM "false"
  regler ENABLE_ANONYMOUS_USERS "false"

  # Fonction « notifications » : l'accès est contrôlé par l'en-tête secret, pas
  # par le JWT (la clé publiable est un JWT valide présent dans le bundle).
  regler FUNCTIONS_VERIFY_JWT "false"

  regler STUDIO_DEFAULT_ORGANIZATION "CESI"
  regler STUDIO_DEFAULT_PROJECT "Helpdesk"
  regler OPENAI_API_KEY ""
  regler POOLER_TENANT_ID "helpdesk"
  regler STORAGE_TENANT_ID "helpdesk"

  # Bloc Helpdesk.
  regler HELPDESK_REPO "$HELPDESK_REPO"
  regler FUNCTION_SECRET "$(openssl rand -hex 32)"
  regler PUBLIC_APP_URL "https://$domaine"

  chmod 600 .env
fi

# ---------------------------------------------------------------------------
# 3. Surcouche (recopiée à chaque exécution : c'est le dépôt qui fait foi)
# ---------------------------------------------------------------------------
cp "$OVERLAY/docker-compose.helpdesk.yml" docker-compose.helpdesk.yml
[ -d "$HELPDESK_REPO/supabase/functions/notifications" ] \
  || { echo "Fonction introuvable : $HELPDESK_REPO/supabase/functions/notifications (HELPDESK_REPO ?)" >&2; exit 1; }

echo "→ Validation de la configuration Compose"
docker compose config --quiet

# ---------------------------------------------------------------------------
# 4. Démarrage
# ---------------------------------------------------------------------------
echo "→ Téléchargement des images (long la première fois)"
docker compose pull --quiet
echo "→ Démarrage de la pile"
docker compose up -d --wait

echo
echo "Pile Supabase démarrée dans $SUPABASE_DIR."
echo
echo "  Passerelle (locale)  : http://127.0.0.1:8001   (Studio : identifiants DASHBOARD_* du .env)"
echo "  Postgres direct      : 127.0.0.1:5433          (migrations)"
echo
echo "  VITE_SUPABASE_URL             = https://$domaine"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY = $(grep '^ANON_KEY=' .env | cut -d= -f2-)"
echo
echo "Étape suivante : bash deploy/scripts/appliquer-migrations.sh"
