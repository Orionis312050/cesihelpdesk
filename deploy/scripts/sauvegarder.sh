#!/usr/bin/env bash
# Sauvegarde de CESI Helpdesk : dump de la base + archive des photos.
#
# Ce qui compte vraiment : les schémas public (tickets, salles, comptes…), auth
# (identités) et storage (index des fichiers) — plus les fichiers eux-mêmes dans
# volumes/storage. Le reste de la pile se réinstalle avec les scripts.
#
# À planifier (root) :  sudo crontab -e
#   30 2 * * * /opt/cesihelpdesk/deploy/scripts/sauvegarder.sh >> /var/log/helpdesk-sauvegarde.log 2>&1
#
# Restauration : docs/07-autohebergement.md § Sauvegardes.
# Variables : SUPABASE_DIR (défaut /opt/supabase), DEST (défaut /var/backups/helpdesk),
#             RETENTION_JOURS (défaut 14).

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"
DEST="${DEST:-/var/backups/helpdesk}"
RETENTION_JOURS="${RETENTION_JOURS:-14}"
horodatage="$(date +%Y%m%d-%H%M)"

mkdir -p "$DEST"
umask 077

echo "[$(date -Is)] Dump de la base → $DEST/base-$horodatage.dump"
docker exec supabase-db pg_dump -U postgres -d postgres --format=custom --no-owner \
  --schema=public --schema=auth --schema=storage --schema=supabase_migrations \
  > "$DEST/base-$horodatage.dump"

echo "[$(date -Is)] Archive des photos → $DEST/storage-$horodatage.tar.gz"
tar -czf "$DEST/storage-$horodatage.tar.gz" -C "$SUPABASE_DIR/volumes" storage

echo "[$(date -Is)] Copie du .env de la pile (clés, secrets) → $DEST/env-$horodatage"
cp "$SUPABASE_DIR/.env" "$DEST/env-$horodatage"

echo "[$(date -Is)] Rotation : suppression au-delà de $RETENTION_JOURS jours"
find "$DEST" -maxdepth 1 -type f -mtime +"$RETENTION_JOURS" -print -delete

echo "[$(date -Is)] Terminé : $(du -sh "$DEST" | cut -f1) dans $DEST"
