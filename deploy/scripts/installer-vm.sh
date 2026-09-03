#!/usr/bin/env bash
# Prépare une VM Debian 13 fraîche pour héberger CESI Helpdesk.
#
# Installe Docker CE (dépôt officiel — la version Debian ne connaît pas `!override`),
# Node 22 (build du front, CLI Supabase via npx), un pare-feu minimal et l'agent
# QEMU (pour que Proxmox voie l'IP de la VM et l'arrête proprement).
#
# À lancer UNE fois, en root :
#   sudo bash deploy/scripts/installer-vm.sh
#
# Note sur le pare-feu : les ports publiés par Docker (8000, 8080) CONTOURNENT ufw
# (Docker écrit ses propres règles iptables). Le filtrage par adresse source est
# donc fait dans le nginx de deploy/web (`allow ${NPM_IP}`), pas ici. ufw ne sert
# qu'à ne laisser entrer que SSH sur la VM elle-même.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancez ce script en root : sudo bash $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "→ Paquets de base"
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg git openssl jq ufw qemu-guest-agent

echo "→ Docker CE"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $codename stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker qemu-guest-agent

echo "→ Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get install -y -q nodejs

echo "→ Pare-feu (SSH seulement ; 8000/8080 filtrés par nginx)"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

echo "→ Fuseau horaire"
timedatectl set-timezone Europe/Paris

echo "→ Dossiers"
mkdir -p /opt/cesihelpdesk /opt/supabase /var/backups/helpdesk
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  usermod -aG docker "$SUDO_USER"
  chown "$SUDO_USER:$SUDO_USER" /opt/cesihelpdesk /opt/supabase /var/backups/helpdesk
  echo "   $SUDO_USER ajouté au groupe docker : reconnectez-vous pour que ce soit pris en compte."
fi

echo
echo "VM prête."
echo "  Docker  : $(docker --version)"
echo "  Compose : $(docker compose version --short)"
echo "  Node    : $(node --version)"
echo
echo "Étape suivante : cloner le dépôt dans /opt/cesihelpdesk puis"
echo "  bash deploy/scripts/installer-supabase.sh"
