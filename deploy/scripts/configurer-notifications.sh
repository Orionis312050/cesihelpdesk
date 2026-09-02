#!/usr/bin/env bash
# Relie la base à la fonction Edge « notifications ».
#
# Le déclencheur d'alerte (risque d'accident) et la tâche pg_cron du vendredi
# appellent la fonction via pg_net, avec l'URL et le secret stockés dans
# public.configuration. Ici l'URL est INTERNE au réseau Docker : le conteneur
# `db` joint la passerelle `api-gw` par son nom, sans passer par Internet ni par
# NPM — une alerte part même si le DNS public est en panne.
#
# Usage (sur la VM) :
#   bash deploy/scripts/configurer-notifications.sh           # configure
#   bash deploy/scripts/configurer-notifications.sh --tester  # + déclenche un récapitulatif de test
#
# Variables : SUPABASE_DIR (défaut /opt/supabase).

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
URL_INTERNE="http://api-gw:8000/functions/v1/notifications"

[ -f "$SUPABASE_DIR/.env" ] || { echo "Pile absente : $SUPABASE_DIR/.env introuvable." >&2; exit 1; }
lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }
FUNCTION_SECRET="$(lire_env FUNCTION_SECRET)"
[ -n "$FUNCTION_SECRET" ] || { echo "FUNCTION_SECRET vide dans $SUPABASE_DIR/.env." >&2; exit 1; }

psql_db() { docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ Écriture dans public.configuration"
# Variables psql : aucun problème de guillemets, quel que soit le secret.
psql_db -v url="$URL_INTERNE" -v secret="$FUNCTION_SECRET" <<'SQL'
update public.configuration set valeur = :'url'    where cle = 'url_fonction_notifications';
update public.configuration set valeur = :'secret' where cle = 'secret_notifications';
SQL
psql_db -c "select cle, case when cle = 'secret_notifications' then '(défini, ' || length(valeur) || ' car.)' else valeur end as valeur from public.configuration order by cle;"

if [ "${1:-}" = "--tester" ]; then
  echo "→ Appel direct de la fonction (mode recap) pour valider secret et transport"
  reponse="$(curl -s -X POST "http://127.0.0.1:8001/functions/v1/notifications" \
    -H "x-secret-notifications: $FUNCTION_SECRET" -H "Content-Type: application/json" \
    -d '{"mode":"recap"}')"
  echo "   $reponse"
  echo "→ Dernières lignes d'email_log"
  psql_db -c "select type, destinataires, statut, erreur, envoye_le from public.email_log order by id desc limit 3;"
  echo "   En mode console, le corps du message est dans : docker logs supabase-edge-functions --tail 40"
fi

echo
echo "Test de bout en bout : déclarez un incident en cochant « Risque d'accident »,"
echo "puis vérifiez public.email_log (statut 'simule' en mode console, 'envoye' en SMTP)."
