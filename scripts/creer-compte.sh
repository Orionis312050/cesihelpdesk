#!/usr/bin/env bash
# Création d'un compte du personnel.
#
# Les comptes ne peuvent pas être créés depuis `seed.sql` : l'identité vit dans
# `auth.users`, géré par Supabase Auth (hachage du mot de passe, jetons). On
# passe donc par l'API d'inscription. Le déclencheur `on_auth_user_created`
# crée automatiquement la ligne correspondante dans `utilisateurs`.
#
# Usage :
#   bash scripts/creer-compte.sh <email> <mot-de-passe> "<Nom Complet>" [admin|technicien]
#
# Exemple :
#   bash scripts/creer-compte.sh admin@viacesi.fr 'MotDePasseTest123!' "Alex Martin" admin
#
# Sur un projet hébergé, renseignez SB_URL et SB_ANON :
#   SB_URL=https://xxx.supabase.co SB_ANON=sb_publishable_... bash scripts/creer-compte.sh ...

set -euo pipefail

SB_URL="${SB_URL:-http://127.0.0.1:54321}"
SB_ANON="${SB_ANON:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"

email="${1:-}"
motdepasse="${2:-}"
nom="${3:-}"
role="${4:-technicien}"

if [ -z "$email" ] || [ -z "$motdepasse" ] || [ -z "$nom" ]; then
  echo "Usage : bash scripts/creer-compte.sh <email> <mot-de-passe> \"<Nom Complet>\" [admin|technicien]" >&2
  exit 1
fi

if [ "$role" != "admin" ] && [ "$role" != "technicien" ]; then
  echo "Rôle invalide : « $role ». Valeurs acceptées : admin, technicien." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Le corps passe par un fichier : sous Git Bash, les arguments non-ASCII
# (accents d'un nom propre) sont réencodés et arrivent en JSON invalide.
cat > "$tmp/inscription.json" <<JSON
{"email":"$email","password":"$motdepasse","data":{"nom_complet":"$nom","role":"$role"}}
JSON

reponse="$(curl -s -X POST "$SB_URL/auth/v1/signup" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  --data-binary "@$tmp/inscription.json")"

if echo "$reponse" | grep -q '"error\|"msg"'; then
  echo "Échec de la création : $reponse" >&2
  exit 1
fi

printf 'Compte créé : %s (%s, rôle %s)\n' "$email" "$nom" "$role"
echo 'Vérifiez avec :  select nom_complet, email, role, actif from utilisateurs;'
