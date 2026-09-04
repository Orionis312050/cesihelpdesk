#!/usr/bin/env bash
# Contrôles de mise en service, exécutés contre l'URL PUBLIQUE (via NPM).
#
# Usage :
#   bash deploy/scripts/verifier-deploiement.sh [domaine]
# Depuis la VM, le domaine et la clé sont lus dans le .env de la pile si omis.
# Depuis un autre poste : SB_ANON=<ANON_KEY> bash deploy/scripts/verifier-deploiement.sh helpdesk.cesilarochelle.fr
#
# Ce que ça prouve :
#   1. l'inscription publique est fermée — le contrôle qui empêche l'escalade admin ;
#   2. Studio et les routes d'administration ne sont pas exposés ;
#   3. la réécriture SPA fonctionne (un QR code scanné ne donne pas 404) ;
#   4. HTTP redirige vers HTTPS et le certificat est valide ;
#   5. l'API répond à travers NPM et le filtre, et les fonctions refusent un
#      appel non habilité (secret absent, ou jeton qui n'est pas administrateur).
#
# Complément : SB_URL=https://<domaine> SB_ANON=… bash scripts/verifier-rls.sh (22 tests RLS).

set -uo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }

hote="${1:-$(lire_env SITE_URL | sed 's|https\?://||')}"
SB_ANON="${SB_ANON:-$(lire_env ANON_KEY)}"

if [ -z "$hote" ] || [ -z "$SB_ANON" ]; then
  echo "Usage : SB_ANON=<ANON_KEY> bash $0 <domaine>" >&2
  exit 1
fi

ok=0
ko=0
reussite() { printf '  \033[32mOK\033[0m    %s\n' "$1"; ok=$((ok + 1)); }
echec()    { printf '  \033[31mÉCHEC\033[0m %s\n' "$1"; ko=$((ko + 1)); }
titre()    { printf '\n\033[1m%s\033[0m\n' "$1"; }
code()     { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }

titre "1. Inscription publique fermée (https://$hote)"
reponse="$(curl -s --max-time 15 -X POST "https://$hote/auth/v1/signup" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  -d '{"email":"intrus@example.com","password":"Intrus12345!","data":{"role":"admin"}}')"
if echo "$reponse" | grep -qi 'signup_disabled\|Signups not allowed'; then
  reussite "POST /auth/v1/signup refusé : $(echo "$reponse" | tr -d '\n' | cut -c1-80)"
else
  echec "POST /auth/v1/signup n'a PAS été refusé — DISABLE_SIGNUP=true manquant ? Réponse : $(echo "$reponse" | cut -c1-120)"
fi

titre "2. Studio et administration non exposés"
# Ces chemins ne sont pas routés vers l'API par NPM : ils tombent sur l'application
# (index.html), jamais sur Studio.
for chemin in "/project/default" "/pg/" "/api/platform/profile"; do
  corps="$(curl -s --max-time 15 "https://$hote$chemin")"
  if echo "$corps" | grep -q '<div id="root">'; then
    reussite "GET $chemin → application, pas Studio"
  else
    echec "GET $chemin ne renvoie pas l'application (Studio exposé ?)"
  fi
done
c="$(code "https://$hote/rest/v1/" -H "apikey: $SB_ANON")"
case "$c" in
  401|403|404) reussite "GET /rest/v1/ → $c (racine OpenAPI fermée aux anonymes)" ;;
  *) echec "GET /rest/v1/ → $c (attendu 401/403/404)" ;;
esac

titre "3. Réécriture SPA"
for chemin in "/incident/1" "/salle/B204" "/suivi" "/qr-codes"; do
  corps="$(curl -s --max-time 15 "https://$hote$chemin")"
  if echo "$corps" | grep -q '<div id="root">'; then
    reussite "GET $chemin sert index.html"
  else
    echec "GET $chemin ne sert pas index.html"
  fi
done

titre "4. TLS et redirection"
c="$(code "http://$hote/")"
case "$c" in
  301|302|307|308) reussite "http://$hote → $c" ;;
  *) echec "http://$hote → $c (attendu redirection vers https)" ;;
esac
if curl -s --max-time 15 -o /dev/null "https://$hote/"; then
  reussite "certificat valide : $hote"
else
  echec "certificat invalide ou hôte injoignable : $hote"
fi

titre "5. API à travers NPM et le filtre"
c="$(code "https://$hote/rest/v1/salles?select=nom&limit=1" -H "apikey: $SB_ANON")"
[ "$c" = "200" ] && reussite "GET /rest/v1/salles → 200 (référentiel public lisible)" || echec "GET /rest/v1/salles → $c — custom location /rest/ manquante dans NPM ?"
c="$(code "https://$hote/auth/v1/health" -H "apikey: $SB_ANON")"
[ "$c" = "200" ] && reussite "GET /auth/v1/health → 200" || echec "GET /auth/v1/health → $c — custom location /auth/ manquante dans NPM ?"
c="$(code -X POST "https://$hote/functions/v1/notifications" -H "Content-Type: application/json" -d '{"mode":"recap"}')"
[ "$c" = "401" ] && reussite "POST /functions/v1/notifications sans secret → 401" || echec "POST /functions/v1/notifications sans secret → $c (attendu 401)"
# Sans le secret, la purge des photos ne doit pas pouvoir être déclenchée.
c="$(code -X POST "https://$hote/functions/v1/maintenance" -H "Content-Type: application/json" -d '{"mode":"purge_photos"}')"
[ "$c" = "401" ] && reussite "POST /functions/v1/maintenance sans secret → 401" || echec "POST /functions/v1/maintenance sans secret → $c (attendu 401)"
# Sans jeton d'administrateur, « comptes » ne doit créer personne : c'est le seul
# rempart, la fonction détenant la clé de service.
c="$(code -X POST "https://$hote/functions/v1/comptes" -H "Content-Type: application/json" \
  -d '{"action":"inviter","email":"intrus@example.com","nom_complet":"Intrus","role":"admin"}')"
[ "$c" = "401" ] && reussite "POST /functions/v1/comptes sans jeton → 401" || echec "POST /functions/v1/comptes sans jeton → $c (attendu 401)"
# La clé publiable est un JWT valide : elle ne doit pas plus passer.
c="$(code -X POST "https://$hote/functions/v1/comptes" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SB_ANON" \
  -d '{"action":"inviter","email":"intrus@example.com","nom_complet":"Intrus","role":"admin"}')"
case "$c" in
  401|403) reussite "POST /functions/v1/comptes avec la clé publiable → $c" ;;
  *) echec "POST /functions/v1/comptes avec la clé publiable → $c (attendu 401/403)" ;;
esac
c="$(code "https://$hote/storage/v1/object/incidents/inexistant.jpg")"
case "$c" in
  400|401|403|404) reussite "GET objet du bucket privé sans jeton → $c" ;;
  *) echec "GET objet du bucket privé sans jeton → $c — custom location /storage/ manquante dans NPM ?" ;;
esac

printf '\n\033[1m%d réussite(s), %d échec(s)\033[0m\n' "$ok" "$ko"
[ "$ko" -eq 0 ]
