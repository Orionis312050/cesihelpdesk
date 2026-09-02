#!/usr/bin/env bash
# Crée un compte du personnel sur l'instance autohébergée — inscription fermée.
#
# En production, DISABLE_SIGNUP=true : l'API publique /auth/v1/signup refuse tout
# le monde. C'est ce qui empêche un inconnu de s'inscrire avec role=admin (le
# déclencheur gerer_nouvel_utilisateur() lit le rôle dans les métadonnées fournies
# à l'inscription). scripts/creer-compte.sh, qui passe par cette API publique, ne
# fonctionne donc qu'en local. Ici on utilise l'API d'administration de Supabase
# Auth avec la clé de service, joignable uniquement depuis la VM (127.0.0.1:8001).
#
# Usage (sur la VM) :
#   bash deploy/scripts/creer-compte-admin.sh <email> <mot-de-passe> "<Nom Complet>" [admin|technicien]
#
# Le même script réinitialise un mot de passe si le compte existe déjà (il n'y a
# pas d'e-mail de récupération tant que le transport est en mode console) :
#   bash deploy/scripts/creer-compte-admin.sh <email> <nouveau-mot-de-passe>
#
# Variables : SUPABASE_DIR (défaut /opt/supabase).

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
API="http://127.0.0.1:8001"

email="${1:-}"
motdepasse="${2:-}"
nom="${3:-}"
role="${4:-technicien}"

if [ -z "$email" ] || [ -z "$motdepasse" ]; then
  echo "Usage : bash $0 <email> <mot-de-passe> \"<Nom Complet>\" [admin|technicien]" >&2
  exit 1
fi
if [ "$role" != "admin" ] && [ "$role" != "technicien" ]; then
  echo "Rôle invalide : « $role ». Valeurs acceptées : admin, technicien." >&2
  exit 1
fi
command -v jq >/dev/null || { echo "jq est requis (apt-get install jq)." >&2; exit 1; }

[ -f "$SUPABASE_DIR/.env" ] || { echo "Pile absente : $SUPABASE_DIR/.env introuvable." >&2; exit 1; }
lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }
SERVICE_ROLE_KEY="$(lire_env SERVICE_ROLE_KEY)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# admin_api <méthode> <chemin> [fichier-json]
admin_api() {
  if [ -n "${3:-}" ]; then
    curl -s -X "$1" "$API/auth/v1/admin/$2" \
      -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" --data-binary "@$3"
  else
    curl -s -X "$1" "$API/auth/v1/admin/$2" \
      -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
  fi
}

# Le compte existe-t-il déjà ? (recherche exacte par e-mail)
existant="$(admin_api GET "users?page=1&per_page=1000" | jq -r --arg e "$email" '.users[]? | select(.email == $e) | .id' | head -n1)"

if [ -n "$existant" ]; then
  echo "Compte existant ($existant) : réinitialisation du mot de passe."
  jq -n --arg p "$motdepasse" '{password: $p}' > "$tmp/maj.json"
  reponse="$(admin_api PUT "users/$existant" "$tmp/maj.json")"
  echo "$reponse" | jq -e '.id' >/dev/null || { echo "Échec : $reponse" >&2; exit 1; }
  echo "Mot de passe mis à jour pour $email."
  exit 0
fi

[ -n "$nom" ] || { echo "Le nom complet est requis pour créer un compte." >&2; exit 1; }

# Le corps est construit par jq : accents et caractères spéciaux échappés proprement.
# email_confirm : pas d'e-mail de confirmation à attendre (aucun SMTP en mode console).
jq -n --arg e "$email" --arg p "$motdepasse" --arg n "$nom" --arg r "$role" \
  '{email: $e, password: $p, email_confirm: true, user_metadata: {nom_complet: $n, role: $r}}' \
  > "$tmp/creation.json"

reponse="$(admin_api POST users "$tmp/creation.json")"
echo "$reponse" | jq -e '.id' >/dev/null || { echo "Échec de la création : $reponse" >&2; exit 1; }

printf 'Compte créé : %s (%s, rôle %s)\n' "$email" "$nom" "$role"
echo 'Vérifiez avec :'
echo "  docker exec -i supabase-db psql -U postgres -d postgres -c \"select nom_complet, email, role, actif from public.utilisateurs;\""
