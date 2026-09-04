# deploy/ — autohébergement

Tout ce qu'il faut pour faire tourner CESI Helpdesk sur l'infrastructure NumériLab
(Proxmox + Nginx Proxy Manager), sans dépendance à un service externe.

La procédure complète, pas à pas, est dans **[docs/07-autohebergement.md](../docs/07-autohebergement.md)**.
Ce dossier n'en est que l'outillage.

| Chemin | Rôle |
| --- | --- |
| `scripts/installer-vm.sh` | Prépare une VM Debian 13 : Docker, Node 22, pare-feu, agent QEMU |
| `scripts/installer-supabase.sh` | Installe la pile Supabase (clone épinglé + `.env` + surcouche) dans `/opt/supabase` |
| `scripts/appliquer-migrations.sh` | Applique `supabase/migrations/` puis charge les référentiels (ou la démo) |
| `scripts/deployer-web.sh` | Construit `dist/` avec les variables de production et démarre le nginx |
| `scripts/creer-compte-admin.sh` | Crée le **premier** compte, ou rejoue un mot de passe, par l'API d'administration. Les suivants s'invitent depuis le menu **Utilisateurs** |
| `scripts/configurer-notifications.sh` | Relie la base aux fonctions « notifications » et « maintenance » (URL internes + secret) |
| `scripts/verifier-deploiement.sh` | Contrôles de mise en service contre les URL publiques |
| `scripts/sauvegarder.sh` | Dump de la base + archive des photos, rotation 14 jours |
| `supabase-overlay/docker-compose.helpdesk.yml` | Surcouche empilée sur le compose amont, sans le modifier |
| `supabase-overlay/helpdesk.env.example` | Variables ajoutées au `.env` de la pile |
| `web/` | nginx : sert `dist/` et filtre l'accès public à l'API Supabase |
| `sql/referentiels.sql` | Salles et catégories, sans les tickets de démonstration |

Rien ici ne contient de secret : les `.env` réels sont ignorés par Git.
