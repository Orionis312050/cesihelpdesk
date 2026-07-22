# CESI Helpdesk

Application de déclaration et de suivi des incidents du campus CESI, réalisée avec React, TypeScript, Vite et Tailwind CSS.

Elle propose :

- un formulaire de déclaration d'incident ;
- une liste de suivi avec recherche et filtres ;
- la modification du statut, du technicien et du commentaire administratif ;
- des statistiques et un export CSV ;
- Supabase pour le développement local ;
- une API Express avec MySQL pour la production.

## Prérequis

- Node.js 20 ou une version plus récente ;
- npm ;
- un projet Supabase pour le développement ;
- une base MySQL pour le mode production.

## Installation

```sh
npm install
```

## Fichiers d'environnement

Les fichiers `.env.development` et `.env.production` contiennent des valeurs propres à chaque machine. Ils sont ignorés par Git et ne doivent pas être commités.

### Développement avec Supabase

Créez `.env.development` à partir de `.env.development.example` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_votre_cle
```

- `VITE_SUPABASE_URL` : URL affichée dans les paramètres API du projet Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY` : clé publique/publishable du projet.

Les variables préfixées par `VITE_` sont intégrées au code envoyé au navigateur. N'y placez jamais une clé secrète Supabase, une clé `service_role` ou un mot de passe de base de données.

Vite charge `.env.development` avec `npm run dev`. Un fichier portant uniquement le suffixe `.example` sert de modèle et n'est pas chargé automatiquement.

### Production avec MySQL

Créez `.env.production` à partir de `.env.production.example` :

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cesihelpdesk
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=cesihelpdesk
MYSQL_CONNECTION_LIMIT=10
PORT=3000
```

- `MYSQL_HOST` : adresse du serveur MySQL.
- `MYSQL_PORT` : port MySQL, généralement `3306`.
- `MYSQL_USER` et `MYSQL_PASSWORD` : identifiants du compte MySQL.
- `MYSQL_DATABASE` : nom de la base.
- `MYSQL_CONNECTION_LIMIT` : nombre maximal de connexions du pool.
- `PORT` : port HTTP de l'application Express.

Ces variables sont lues uniquement par `server.mjs`. Sur un hébergeur, renseignez-les dans l'interface de configuration plutôt que dans un fichier versionné.

## Configurer Supabase

L'application utilise les tables suivantes du schéma `public` :

- `tickets` ;
- `salles` ;
- `categories_incident` ;
- `ticket_categories` ;
- `utilisateurs`.

Après la création ou l'import des tables et des données, exécutez [`database/supabase-policies.sql`](database/supabase-policies.sql) dans le **SQL Editor** de Supabase.

Activer le RLS ne suffit pas : sans politique, l'API Supabase ne renvoie aucune ligne. Le script fournit les autorisations nécessaires à la clé publique pendant le développement.

> Les politiques fournies donnent un accès anonyme aux tickets. Elles sont destinées au développement et doivent être remplacées par des règles liées à l'authentification avant une mise en production publique.

Lancez ensuite l'application :

```sh
npm run dev
```

## Lancer la production avec MySQL

1. Créez la base MySQL.
2. Exécutez [`database/mysql.sql`](database/mysql.sql).
3. Configurez `.env.production`.
4. Construisez et démarrez l'application :

```sh
npm run build
npm start
```

Express sert les fichiers générés dans `dist` et expose l'API `/api/tickets`. Les identifiants MySQL restent côté serveur et ne sont jamais envoyés au navigateur.

## Commandes disponibles

```sh
npm run dev      # serveur Vite de développement avec Supabase
npm run build    # vérification TypeScript et build de production
npm start        # serveur Express/MySQL de production
npm run preview  # aperçu local du build Vite
npm run lint     # analyse ESLint
```

## Vérifications avant livraison

```sh
npm run lint
npm run build
```

## Structure principale

```text
src/components/       composants React
src/services/         accès aux données
src/types/            types TypeScript
database/             scripts SQL et politiques Supabase
server.mjs            serveur Express de production
```

## Dépannage

- **Variables Supabase requises** : vérifiez que le fichier s'appelle exactement `.env.development`, puis redémarrez Vite.
- **Tableaux vides sans erreur** : vérifiez les politiques RLS des cinq tables et que l'URL pointe vers le bon projet Supabase.
- **Erreur de colonne ou de relation** : vérifiez que le schéma importé correspond aux tables listées ci-dessus.
- **Variables MySQL manquantes** : contrôlez `.env.production` ou les variables configurées chez l'hébergeur.
