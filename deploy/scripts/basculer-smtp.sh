#!/usr/bin/env bash
# Bascule l'envoi des e-mails du mode « console » vers un vrai relais SMTP.
#
# Usage :
#   bash deploy/scripts/basculer-smtp.sh <hote> <port> <utilisateur> <expediteur> ["Nom affiché"]
#
# Exemple (Mailjet) :
#   bash deploy/scripts/basculer-smtp.sh in-v3.mailjet.com 465 <API-Key> vous@example.com "CESI Helpdesk"
#
# La clé secrète / mot de passe est demandée à l'invite, JAMAIS en argument :
# un argument se retrouve dans l'historique du shell et dans `ps`.
#
# Ces variables sont PARTAGÉES avec Supabase Auth : après bascule, les liens
# « mot de passe oublié » fonctionnent aussi.
#
# Relançable : réécrit les valeurs et redémarre les services concernés.

set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"

hote="${1:-}"
port="${2:-}"
utilisateur="${3:-}"
expediteur="${4:-}"
nom="${5:-CESI Helpdesk}"

if [ -z "$hote" ] || [ -z "$port" ] || [ -z "$utilisateur" ] || [ -z "$expediteur" ]; then
  echo "Usage : bash $0 <hote> <port> <utilisateur> <expediteur> [\"Nom affiché\"]" >&2
  echo "Ex.   : bash $0 in-v3.mailjet.com 465 <API-Key> vous@example.com \"CESI Helpdesk\"" >&2
  exit 1
fi

[ -f "$SUPABASE_DIR/.env" ] || { echo "Pile absente : $SUPABASE_DIR/.env introuvable." >&2; exit 1; }

# Garde-fous sur les erreurs qui coûtent le plus cher à diagnostiquer.
if [ "$hote" = "supabase-mail" ]; then
  echo "Refusé : « supabase-mail » est le service factice du .env amont, absent de la pile." >&2
  exit 1
fi
case "$port" in
  25) echo "Refusé : le port 25 est presque toujours filtré et sans authentification. Utilisez 587 ou 465." >&2; exit 1 ;;
  465) ;;
  587) echo "Attention : 587 = STARTTLS, que denomailer 1.6.0 (fonction notifications) gère mal :" >&2
       echo "           le worker est tué et l'alerte perdue sans trace. Préférez 465 si le relais l'offre." >&2 ;;
  *) echo "Port inhabituel ($port) : 587 = STARTTLS, 465 = TLS direct. Vérifiez avant de continuer." >&2 ;;
esac
case "$expediteur" in
  *@*.*) ;;
  *) echo "Refusé : « $expediteur » n'est pas une adresse e-mail." >&2; exit 1 ;;
esac

# Mot de passe : lu sur le terminal, sans écho. `read -s` a besoin d'un TTY —
# d'où le `ssh -t` mentionné dans la documentation.
if [ ! -t 0 ]; then
  echo "Ce script a besoin d'un terminal pour lire la clé secrète sans l'afficher." >&2
  echo "Depuis votre poste : ssh -t <utilisateur>@<vm> \"cd /opt/cesihelpdesk && bash $0 …\"" >&2
  exit 1
fi
echo "Sous Windows, collez avec un clic droit (ou Ctrl+Maj+V) : Ctrl+V ne fonctionne"
echo "pas dans une invite masquée, et Entrée enregistrerait alors une clé vide."
printf 'Clé secrète / mot de passe SMTP (saisie masquée) : '
read -rs motdepasse
echo
# Un terminal Windows envoie « \r » avec Entrée ; `read` le garde comme donnée.
# Sans ce nettoyage, une saisie vide passerait pour une clé d'un caractère.
motdepasse="${motdepasse//$'\r'/}"
if [ "${#motdepasse}" -lt 16 ]; then
  echo "Refusé : clé de ${#motdepasse} caractère(s). Une clé SMTP fait au moins 16 caractères" >&2
  echo "        (Mailjet : 32). Le collage n'a probablement pas été pris en compte." >&2
  exit 1
fi

cd "$SUPABASE_DIR"

# Sauvegarde horodatée : ce fichier porte toutes les clés de la pile.
sauvegarde=".env.avant-smtp-$(date +%Y%m%d-%H%M%S)"
cp .env "$sauvegarde"
chmod 600 "$sauvegarde"
echo "→ Sauvegarde du .env : $SUPABASE_DIR/$sauvegarde"

# Remplace la valeur d'une clé existante, ou l'ajoute. Le mot de passe passe par
# l'environnement et non par la ligne de commande de sed, pour ne pas l'exposer
# dans `ps`, et le remplacement se fait en awk pour ne rien interpréter.
regler() {
  local cle="$1" valeur="$2"
  VALEUR="$valeur" CLE="$cle" awk '
    BEGIN { cle = ENVIRON["CLE"]; valeur = ENVIRON["VALEUR"]; trouve = 0 }
    index($0, cle "=") == 1 { print cle "=" valeur; trouve = 1; next }
    { print }
    END { if (!trouve) print cle "=" valeur }
  ' .env > .env.tmp && mv .env.tmp .env
}

echo "→ Écriture des réglages SMTP"
regler SMTP_HOST "$hote"
regler SMTP_PORT "$port"
regler SMTP_USER "$utilisateur"
regler SMTP_PASS "$motdepasse"
regler SMTP_ADMIN_EMAIL "$expediteur"
regler SMTP_SENDER_NAME "$nom"
regler MAIL_TRANSPORT "smtp"
chmod 600 .env

echo "   SMTP_HOST         = $hote"
echo "   SMTP_PORT         = $port"
echo "   SMTP_USER         = $utilisateur"
echo "   SMTP_PASS         = (masqué, ${#motdepasse} caractères)"
echo "   SMTP_ADMIN_EMAIL  = $expediteur"
echo "   SMTP_SENDER_NAME  = $nom"
echo "   MAIL_TRANSPORT    = smtp"

# `auth` pour les liens de récupération, `functions` pour les alertes.
echo "→ Redémarrage de auth et functions"
docker compose up -d --wait auth functions >/dev/null
docker compose ps --format '{{.Service}}\t{{.Status}}' | grep -E '^(auth|functions)' || true

echo
echo "Transport SMTP activé. Vérifiez maintenant, vers une adresse à vous :"
echo "  bash deploy/scripts/tester-smtp.sh <votre-adresse>"
echo
echo "Puis la chaîne complète : un incident coché « risque d'accident » sur le site,"
echo "et public.email_log doit afficher statut = 'envoye'."
