# 01 — Installation

Procédure complète, depuis un poste vierge jusqu'à une application fonctionnelle.
Chaque commande est recopiable telle quelle ; les valeurs à remplacer sont
entre `<chevrons>`.

## Prérequis

| Outil | Version | Vérification |
| --- | --- | --- |
| Node.js | 20 ou plus récent | `node --version` |
| npm | fourni avec Node | `npm --version` |
| Docker Desktop | pour la pile Supabase locale | `docker info` |
| Supabase CLI | appelée via `npx`, rien à installer | `npx supabase --version` |

Docker n'est nécessaire que pour développer en local. Pour travailler
directement contre un projet Supabase hébergé, passez à la section
[Travailler contre un projet hébergé](#travailler-contre-un-projet-hébergé).

## 1. Cloner et installer

```bash
git clone <url-du-depot> cesihelpdesk
cd cesihelpdesk
npm install
```

## 2. Démarrer la base locale

```bash
npx supabase start
```

Le premier lancement télécharge plusieurs images Docker : comptez cinq à dix
minutes. La commande affiche ensuite les informations de connexion.
**Notez `API URL` et `PUBLISHABLE_KEY`**, ils servent à l'étape 4.

Pour les réafficher plus tard :

```bash
npx supabase status
```

## 3. Créer le schéma et charger les données de démonstration

```bash
npm run db:reset
```

Cette commande applique, dans l'ordre, toutes les migrations de
`supabase/migrations/` puis exécute `supabase/seed.sql`. Elle crée :

- les tables `salles`, `categories_incident`, `tickets`, `ticket_categories`,
  `utilisateurs`, `email_log` et `configuration` ;
- le type énuméré `statut_ticket` ;
- les politiques de sécurité (RLS) et la fonction `creer_ticket()` ;
- le bucket de stockage `incidents` ;
- le déclencheur d'alerte urgente et la tâche planifiée hebdomadaire ;
- 22 salles, 10 catégories et 12 incidents de démonstration.

> `db:reset` **efface toutes les données** de la base locale. Ne l'utilisez
> jamais sur la base de production.

## 4. Configurer l'application

```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et renseignez les valeurs relevées à l'étape 2 :

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY affichée par supabase start>
VITE_PUBLIC_APP_URL=http://localhost:5173
```

> ⚠️ **N'utilisez jamais une clé `sb_secret_` ou `service_role` dans une
> variable `VITE_`.** Toutes les variables préfixées `VITE_` sont intégrées au
> JavaScript envoyé au navigateur : une clé secrète y serait lisible par
> n'importe quel visiteur, et elle contourne toutes les règles de sécurité.

## 5. Créer le premier compte

Aucun compte n'existe après l'installation, et l'espace d'administration est
inaccessible sans compte. Les comptes ne peuvent pas être créés depuis
`seed.sql` : l'identité est gérée par Supabase Auth.

```bash
bash scripts/creer-compte.sh admin@viacesi.fr '<MotDePasseSolide123!>' "<Votre Nom>" admin
```

Le quatrième argument est le rôle : `admin` ou `technicien`.

## 6. Lancer l'application

```bash
npm run dev
```

L'application est disponible sur <http://localhost:5173>.

Pour la tester depuis un téléphone — indispensable, c'est le cas d'usage
principal :

```bash
npm run dev -- --host
```

Ouvrez l'adresse `Network` affichée depuis un appareil connecté au même réseau.

## 7. Vérifier que tout fonctionne

```bash
bash scripts/verifier-rls.sh
```

Attendu : **22 réussites, 0 échec**. Ce script vérifie qu'un visiteur anonyme
peut déclarer un incident mais ne peut lire aucune donnée. Relancez-le après
toute modification des politiques de sécurité.

Poursuivez avec le [cahier de recette](06-recette.md), qui sert aussi de
scénario de démonstration.

## 8. Notifications par e-mail (facultatif en développement)

Les e-mails fonctionnent en mode « console » sans aucune configuration : ils
sont composés et journalisés, mais pas envoyés. Cela permet de valider toute la
chaîne avant d'obtenir les identifiants SMTP de l'établissement.

```bash
cp supabase/functions/.env.example supabase/functions/.env
npm run functions:serve
```

Indiquez ensuite à la base où joindre les fonctions — « notifications », et
« maintenance », qui purge les photos anciennes avec le même secret :

```sql
-- À exécuter dans le SQL Editor, ou via psql sur la base locale.
update public.configuration
   set valeur = 'http://host.docker.internal:54321/functions/v1/notifications'
 where cle = 'url_fonction_notifications';

update public.configuration
   set valeur = 'http://host.docker.internal:54321/functions/v1/maintenance'
 where cle = 'url_fonction_maintenance';

update public.configuration
   set valeur = '<le FUNCTION_SECRET de supabase/functions/.env>'
 where cle = 'secret_notifications';
```

Déclarez un incident en cochant « Risque d'accident » : l'e-mail apparaît dans
la sortie de `npm run functions:serve`, et une ligne est ajoutée dans
`email_log`. Le passage à l'envoi réel est décrit dans
[04 — Exploitation](04-exploitation.md#configurer-lenvoi-des-e-mails).

## Travailler contre un projet hébergé

1. Créez un projet sur <https://supabase.com> (région `eu-west`, conservez le
   mot de passe de la base).
2. Rattachez le dépôt au projet :

   ```bash
   npx supabase link --project-ref <ref-du-projet>
   ```

3. Appliquez les migrations :

   ```bash
   npm run db:push
   ```

4. Chargez le jeu de démonstration si souhaité — **jamais en production** :

   ```bash
   npx supabase db execute --file supabase/seed.sql --linked
   ```

5. Renseignez `.env.local` avec l'URL et la clé publiable du projet
   (Project Settings → API).
6. Déployez les fonctions et leurs secrets :

   ```bash
   npx supabase functions deploy notifications
   npx supabase functions deploy comptes
   npx supabase functions deploy maintenance
   npx supabase secrets set FUNCTION_SECRET=<chaine-aleatoire> MAIL_TRANSPORT=console \r
     PUBLIC_APP_URL=https://<votre-application>
   ```

   `PUBLIC_APP_URL` est l'adresse publique de l'application : c'est sur elle que
   sont construits les liens d'invitation et de mot de passe.

7. Créez le premier compte — les suivants s'invitent depuis le menu
   **Utilisateurs** de l'application :

   ```bash
   SB_URL=https://<ref>.supabase.co SB_ANON=<cle-publiable> \
     bash scripts/creer-compte.sh admin@viacesi.fr '<mot-de-passe>' "<Nom>" admin
   ```

## Déploiement en production

Deux façons de mettre l'application en service :

- **Autohébergement** sur l'infrastructure de l'établissement — la pile Supabase
  elle-même tourne en Docker sur une VM, publiée par Nginx Proxy Manager. C'est
  la procédure de **[07 — Autohébergement](07-autohebergement.md)**, outillée par
  le dossier `deploy/`.
- **Front statique + projet Supabase cloud**, décrit ci-dessous.

```bash
npm run build
```

Le dossier `dist/` contient un site statique, déployable sur Netlify, Vercel,
Cloudflare Pages ou tout hébergeur de fichiers.

**Point de vigilance : la réécriture SPA.** Les adresses comme `/incident/12`
ou `/salle/B204` n'existent pas comme fichiers ; elles sont résolues par le
navigateur. Sans réécriture, un accès direct — lien transmis, favori, ou scan
d'un QR code — renvoie une erreur 404.

- Netlify et Cloudflare Pages : le fichier `public/_redirects` est déjà fourni.
- Vercel : ajoutez un `vercel.json` avec une règle `rewrites` vers `/index.html`.
- nginx : `try_files $uri /index.html;`

Renseignez enfin `VITE_PUBLIC_APP_URL` avec l'adresse publique **avant**
d'imprimer les QR codes, sinon les affiches pointeront vers `localhost`. La page
`/qr-codes` affiche un avertissement rouge tant que ce n'est pas le cas.

## Repartir de zéro

```bash
npx supabase stop --no-backup   # supprime la base locale et ses données
npx supabase start
npm run db:reset
```

## En cas de problème

| Symptôme | Cause la plus fréquente |
| --- | --- |
| Écran « Configuration manquante » | `.env.local` absent ou mal nommé ; redémarrez `npm run dev` après l'avoir créé |
| `supabase start` échoue | Docker Desktop n'est pas démarré |
| La liste des salles est vide | `npm run db:reset` n'a pas été exécuté |
| Connexion refusée | Aucun compte créé — voir l'étape 5 |
| Le tableau de suivi est vide alors que la base contient des incidents | Problème de politique RLS — lancez `bash scripts/verifier-rls.sh` |

Le détail du dépannage est dans [04 — Exploitation](04-exploitation.md#dépannage).
