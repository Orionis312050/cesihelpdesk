# CESI Helpdesk

Application React/Vite avec une persistance adaptée à l'environnement :

- développement (`npm run dev`) : accès direct à Supabase ;
- production (`npm run build` puis `npm start`) : API Express et connexion MySQL côté serveur.

## Développement avec Supabase

1. Exécuter `database/supabase.sql` dans l'éditeur SQL Supabase.
2. Copier `.env.development` vers `.env.development` et renseigner l'URL et la clé `anon`.
3. Lancer `npm run dev`.

La policy RLS fournie autorise l'accès anonyme complet pour faciliter le développement. Elle ne doit pas être utilisée telle quelle pour exposer une instance Supabase en production.

## Production avec MySQL

1. Créer une base puis exécuter `database/mysql.sql`.
2. Copier `.env.production` vers `.env.production` et renseigner la connexion MySQL.
3. Exécuter `npm run build`.
4. Lancer `npm start` (le serveur charge `.env.production`, puis `.env` en repli).

Sur un hébergeur, configurez plutôt les variables dans son interface. Le navigateur ne reçoit jamais les identifiants MySQL : il communique uniquement avec `/api/tickets`.

## Vérifications

```sh
npm run lint
npm run build
```
