#!/usr/bin/env bash
# Applique les migrations du dépôt à la base autohébergée, puis charge les données.
#
# Usage :
#   bash deploy/scripts/appliquer-migrations.sh          # référentiels seuls (production)
#   bash deploy/scripts/appliquer-migrations.sh --demo   # + tickets de démonstration (recette)
#
# Variables : SUPABASE_DIR (défaut /opt/supabase), HELPDESK_REPO (défaut : ce dépôt).
#
# ORDRE IMPOSÉ : la pile doit être démarrée. La migration storage_incidents écrit
# dans storage.buckets, table créée par le service `storage` à son premier
# démarrage — avant, elle échoue. Le script attend qu'elle existe.
#
# Les migrations passent par la CLI Supabase (`db push --db-url`) : l'historique
# est tenu dans supabase_migrations.schema_migrations, donc relancer ce script
# n'applique que les nouvelles. Ne JAMAIS utiliser `db reset` sur cette base.

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPDESK_REPO="${HELPDESK_REPO:-$(cd "$ICI/../.." && pwd)}"
demo=0
[ "${1:-}" = "--demo" ] && demo=1

[ -f "$SUPABASE_DIR/.env" ] || { echo "Pile absente : $SUPABASE_DIR/.env introuvable (installer-supabase.sh)." >&2; exit 1; }
lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }
POSTGRES_PASSWORD="$(lire_env POSTGRES_PASSWORD)"

# psql dans le conteneur : socket local, mot de passe déjà dans l'environnement.
psql_db() { docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
storage_pret() {
  psql_db -tAc "select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets'" 2>/dev/null | grep -q 1
}

echo "→ Attente du schéma storage (créé par le service storage au démarrage)"
for _ in $(seq 1 40); do
  storage_pret && break
  sleep 3
done
storage_pret || { echo "storage.buckets toujours absent : la pile est-elle démarrée ? (docker compose ps dans $SUPABASE_DIR)" >&2; exit 1; }

echo "→ Migrations (supabase/migrations) via la CLI"
cd "$HELPDESK_REPO"
# Mot de passe hexadécimal (généré par generate-keys.sh) : rien à encoder dans l'URL.
npx --yes supabase@2 db push --yes --skip-vault \
  --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5433/postgres?sslmode=disable"

if [ "$demo" -eq 1 ]; then
  echo "→ Jeu de démonstration complet (salles, catégories, 12 incidents)"
  psql_db < supabase/seed.sql
else
  echo "→ Référentiels (salles, catégories) — sans incident de démonstration"
  psql_db < deploy/sql/referentiels.sql
fi

echo
echo "Vérifications :"
psql_db -c "select id, public, file_size_limit from storage.buckets;"
psql_db -c "select jobname, schedule, active from cron.job;"
psql_db -c "select (select count(*) from public.salles) as salles, (select count(*) from public.categories_incident) as categories, (select count(*) from public.tickets) as tickets;"
echo
echo "Étape suivante : bash deploy/scripts/deployer-web.sh"
