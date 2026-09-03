#!/usr/bin/env bash
# Teste le relais SMTP configuré, SANS passer par la fonction « notifications ».
#
# Usage :
#   bash deploy/scripts/tester-smtp.sh <destinataire>
#
# Pourquoi ce script existe : la fonction Edge envoie aux adresses de
# ALERT_RECIPIENTS / WEEKLY_RECIPIENTS. Pour valider des identifiants SMTP, on ne
# veut pas déclencher d'envoi vers ces listes — on veut une adresse choisie, et
# un message d'erreur lisible. `curl` sait parler SMTP : aucune dépendance à
# installer, et il rend le dialogue complet avec `-v`.
#
# Variables lues dans $SUPABASE_DIR/.env : SMTP_HOST, SMTP_PORT, SMTP_USER,
# SMTP_PASS, SMTP_ADMIN_EMAIL, SMTP_SENDER_NAME.

set -uo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/supabase}"

destinataire="${1:-}"
if [ -z "$destinataire" ]; then
  echo "Usage : bash $0 <destinataire>" >&2
  echo "Ex.   : bash $0 vous@example.com" >&2
  exit 1
fi

[ -f "$SUPABASE_DIR/.env" ] || { echo "Pile absente : $SUPABASE_DIR/.env introuvable." >&2; exit 1; }
lire_env() { grep "^$1=" "$SUPABASE_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r"'"'"; }

hote="$(lire_env SMTP_HOST)"
port="$(lire_env SMTP_PORT)"
utilisateur="$(lire_env SMTP_USER)"
motdepasse="$(lire_env SMTP_PASS)"
expediteur="$(lire_env SMTP_ADMIN_EMAIL)"
nom="$(lire_env SMTP_SENDER_NAME)"
transport="$(lire_env MAIL_TRANSPORT)"

echo "Relais      : $hote:$port"
echo "Utilisateur : $utilisateur"
echo "Expéditeur  : ${nom:+$nom }<$expediteur>"
echo "Transport   : ${transport:-console}"
echo "Destinataire: $destinataire"
echo

# --- Garde-fous : les erreurs les plus fréquentes, attrapées avant d'appeler curl.
if [ "$hote" = "supabase-mail" ]; then
  echo "ÉCHEC : SMTP_HOST vaut encore « supabase-mail », le service factice du .env amont." >&2
  echo "        Ce conteneur n'existe pas dans la pile self-hosted." >&2
  echo "        Lancez d'abord : bash deploy/scripts/basculer-smtp.sh …" >&2
  exit 1
fi
for couple in "SMTP_HOST:$hote" "SMTP_USER:$utilisateur" "SMTP_PASS:$motdepasse" "SMTP_ADMIN_EMAIL:$expediteur"; do
  if [ -z "${couple#*:}" ]; then
    echo "ÉCHEC : ${couple%%:*} est vide dans $SUPABASE_DIR/.env." >&2
    exit 1
  fi
done

# --- 1. Joignabilité TCP : distingue « port filtré » de « identifiants refusés ».
echo "→ 1/3 Joignabilité de $hote:$port"
if timeout 8 bash -c "exec 3<>/dev/tcp/$hote/$port" 2>/dev/null; then
  banniere="$(timeout 8 bash -c "exec 3<>/dev/tcp/$hote/$port; head -1 <&3" 2>/dev/null | tr -d '\r')"
  echo "   OK — $banniere"
else
  echo "   ÉCHEC : aucune connexion. Port filtré en sortie, ou nom d'hôte erroné." >&2
  exit 1
fi

# --- 2. Envoi. Le corps passe par un fichier : curl attend un message complet
#        (en-têtes + ligne vide + corps), pas seulement un texte.
echo "→ 2/3 Authentification et envoi"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

de="$expediteur"
[ -n "$nom" ] && de="$nom <$expediteur>"

cat > "$tmp/message.txt" <<MESSAGE
From: $de
To: $destinataire
Subject: [CESI Helpdesk] Test du relais SMTP
Date: $(date -R)
Content-Type: text/plain; charset=utf-8

Ce message confirme que le relais SMTP de CESI Helpdesk fonctionne.

  Relais      : $hote:$port
  Expéditeur  : $expediteur
  Envoyé le   : $(date '+%d/%m/%Y à %H:%M:%S %Z')
  Machine     : $(hostname)

Si vous le recevez, les alertes « risque d'accident » et le récapitulatif
hebdomadaire peuvent partir. Vérifiez aussi le dossier indésirable : un
expéditeur relayé par un tiers y atterrit parfois au premier envoi.
MESSAGE

# --ssl-reqd impose STARTTLS : refuse d'envoyer en clair si le serveur ne le
# propose pas. Sur le port 465, on parle smtps (TLS dès la connexion).
protocole="smtp"
[ "$port" = "465" ] && protocole="smtps"

sortie="$(curl --silent --show-error --ssl-reqd \
  --url "$protocole://$hote:$port" \
  --user "$utilisateur:$motdepasse" \
  --mail-from "$expediteur" \
  --mail-rcpt "$destinataire" \
  --upload-file "$tmp/message.txt" \
  --max-time 45 2>&1)"
code=$?

if [ $code -eq 0 ]; then
  echo "   OK — message accepté par le relais"
else
  echo "   ÉCHEC (curl $code) : $sortie" >&2
  echo >&2
  case "$sortie" in
    *535*|*"Authentication"*|*"authentication"*)
      echo "   → 535 : identifiants refusés. Sur Mailflow/Mailjet, SMTP_USER est l'API Key" >&2
      echo "     et SMTP_PASS la Secret Key, pas l'e-mail et le mot de passe du compte." >&2 ;;
    *550*|*553*|*"not allowed"*|*"unverified"*)
      echo "   → 550/553 : expéditeur refusé. L'adresse SMTP_ADMIN_EMAIL ($expediteur)" >&2
      echo "     doit être validée chez le relais (clic sur le lien de confirmation)." >&2 ;;
    *"Timeout"*|*"timed out"*)
      echo "   → Délai dépassé après la connexion : STARTTLS ou l'authentification bloque." >&2 ;;
    *)
      echo "   → Dialogue complet : relancez la même commande curl avec -v." >&2 ;;
  esac
  exit 1
fi

# --- 3. Rappel de ce que « accepté » veut dire.
echo "→ 3/3 Ce que ce résultat prouve"
echo "   Le relais a ACCEPTÉ le message. Il ne prouve pas la distribution :"
echo "   un rebond (boîte inexistante, filtrage) arrive ensuite chez le relais,"
echo "   jamais dans public.email_log."
echo
echo "Vérifiez la réception sur $destinataire (dossier indésirable compris)."
if [ "${transport:-console}" != "smtp" ]; then
  echo
  echo "ATTENTION : MAIL_TRANSPORT vaut « ${transport:-console} ». Le transport est bon,"
  echo "mais la fonction « notifications » continuera de simuler. Pour l'activer :"
  echo "  bash deploy/scripts/basculer-smtp.sh …"
fi
