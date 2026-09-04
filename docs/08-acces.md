# 08 — Accès, identifiants et mises à jour

Fiche de reprise en main : où tourne l'application, comment s'y connecter, comment
la mettre à jour. La procédure d'installation complète est dans
[07 — Autohébergement](07-autohebergement.md).

> ⚠️ Une fois les mots de passe renseignés ci-dessous, ce fichier devient sensible :
> ne le poussez pas sur un dépôt public.

## Où c'est hébergé

Une VM Debian 13 sur le Proxmox du NumériLab, qui fait tourner en Docker la pile
**Supabase autohébergée** (PostgreSQL 17, Auth, Storage, Edge Functions) plus un
nginx qui sert le front compilé. **Nginx Proxy Manager** publie le tout sur
Internet sous un seul nom de domaine, en HTTPS Let's Encrypt.

| Élément | Adresse |
| --- | --- |
| Application (public) | <https://helpdesk.cesilarochelle.fr> |
| VM `helpdesk` | `10.0.50.5` — Debian 13, 4 vCPU / 8 Go / 60 Go |
| Proxmox | <https://10.0.50.20:8006> (royaume `lldap`) |
| Nginx Proxy Manager | <http://10.0.50.21:81> |
| Code de l'application (sur la VM) | `/opt/cesihelpdesk` |
| Pile Supabase (sur la VM) | `/opt/supabase` |
| Dépôt Git | `<url-du-depot>` — branche `feat/refonte-supabase` |

Aucun accès direct depuis Internet à la base ni à Studio : NPM ne laisse passer
que l'application et les cinq préfixes de l'API (`/auth`, `/rest`, `/storage`,
`/functions`, `/realtime`).

## Identifiants

| Accès | Identifiant | Mot de passe |
| --- | --- | --- |
| SSH VM `10.0.50.5` | `<utilisateur>` | `<à compléter>` |
| Proxmox | `<utilisateur>` (royaume `lldap`) | `<à compléter>` |
| Nginx Proxy Manager | `<email>` | `<à compléter>` |
| Studio Supabase | `supabase` | `<à compléter>` |
| Application — compte admin | `admin@viacesi.fr` | `<à compléter>` |
| PostgreSQL (via `psql` sur la VM) | `postgres` | `<à compléter>` |

Les valeurs de référence vivent dans `/opt/supabase/.env` sur la VM, jamais dans
Git :

```bash
grep -E 'DASHBOARD_USERNAME|DASHBOARD_PASSWORD|POSTGRES_PASSWORD|ANON_KEY' /opt/supabase/.env
```

## S'y connecter

```bash
ssh <utilisateur>@10.0.50.5          # la VM
```

L'application : <https://helpdesk.cesilarochelle.fr/connexion> avec le compte
admin ci-dessus. Les autres comptes s'invitent depuis le menu **Comptes**.

## Accéder au Studio Supabase

Studio n'est pas exposé sur Internet. Ouvrez un tunnel SSH depuis votre poste,
puis <http://localhost:8001> :

```bash
ssh -L 8001:127.0.0.1:8001 <utilisateur>@10.0.50.5
```

Identifiants : ligne « Studio Supabase » du tableau ci-dessus. Le *SQL Editor* de
Studio remplace celui du cloud pour toutes les procédures de
[04 — Exploitation](04-exploitation.md).

Sans interface, directement en SQL :

```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

## Mettre à jour l'application

```bash
ssh <utilisateur>@10.0.50.5
cd /opt/cesihelpdesk && git pull
bash deploy/scripts/appliquer-migrations.sh          # seules les nouvelles migrations passent
bash deploy/scripts/deployer-web.sh                  # reconstruit dist/
cd /opt/supabase && docker compose restart functions # si supabase/functions/ a changé
```

**Si une fonction Edge est nouvelle** (et pas seulement modifiée), un `restart` ne
suffit pas — il faut recopier la surcouche et recréer le conteneur :

```bash
cp /opt/cesihelpdesk/deploy/supabase-overlay/docker-compose.helpdesk.yml /opt/supabase/
cd /opt/supabase && docker compose up -d functions
```

Contrôle après chaque mise à jour :

```bash
bash /opt/cesihelpdesk/deploy/scripts/verifier-deploiement.sh helpdesk.cesilarochelle.fr
```

Attendu : **0 échec**.

## Mettre à jour la pile Supabase

Sauvegarde d'abord ; l'outil amont fusionne sans toucher au `.env` ni aux données.

```bash
bash /opt/cesihelpdesk/deploy/scripts/sauvegarder.sh
cd /opt/supabase && sh update.sh --dry-run   # aperçu, puis sh update.sh
sh run.sh pull && sh run.sh recreate
bash /opt/cesihelpdesk/deploy/scripts/verifier-deploiement.sh
```

Reportez ensuite la nouvelle version dans `SUPABASE_REF`
([installer-supabase.sh](../deploy/scripts/installer-supabase.sh)) — actuellement
`self-hosted/v0.8.0`.

## Sauvegardes

Chaque nuit à 2 h 30 dans `/var/backups/helpdesk` (base, photos, `.env`, rotation
14 jours), par `deploy/scripts/sauvegarder.sh` en cron root. La restauration est
détaillée au [§ 11 de la doc d'autohébergement](07-autohebergement.md#11-sauvegardes).
