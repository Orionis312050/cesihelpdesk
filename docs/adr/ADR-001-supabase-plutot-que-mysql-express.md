# ADR-001 — Tout sur Supabase, suppression du serveur Express/MySQL

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le projet fonctionnait avec **deux back-ends en parallèle** :

- en développement, le navigateur interrogeait Supabase directement ;
- en production, un serveur `server.mjs` (Express + MySQL) exposait une API REST.

Le code de service portait la marque de ce doublement : cinq embranchements
`import.meta.env.DEV ? supabase : fetch('/api/…')`, un client Supabase créé deux
fois, et surtout **deux implémentations à maintenir** de la conversion des
statuts et du mappage des lignes.

Ce doublement a un coût mesurable et visible dans l'historique : les
fonctionnalités qui demandaient du serveur — envoi d'e-mails, téléversement de
photos, authentification — n'ont jamais été écrites. Elles ont été **simulées**.
Le formulaire enregistrait le nom du fichier photo sans jamais l'envoyer, et
l'application affichait « un email a été envoyé aux responsables » alors
qu'aucun envoi n'existait.

Contraintes : projet d'école, transmis à d'autres personnes, sans budget
d'hébergement ni d'administration système, avec une équipe réduite.

## Options envisagées

**A. Conserver les deux back-ends.**
✅ Aucun code à jeter. ✅ Indépendance vis-à-vis d'un fournisseur.
❌ Chaque fonctionnalité doit être écrite deux fois — c'est précisément ce qui a
conduit aux simulations. ❌ Deux jeux de bugs, deux schémas à garder alignés.

**B. Tout sur Express + MySQL.**
✅ Un seul chemin. ✅ Portable partout.
❌ Impose d'héberger et de maintenir un serveur Node. ❌ Authentification,
stockage de fichiers et planification à écrire entièrement à la main.

**C. Tout sur Supabase.**
✅ Un seul chemin de données. ✅ Authentification, stockage, fonctions et
planification fournis. ✅ L'application devient un site statique, sans serveur à
administrer. ✅ La sécurité descend dans la base, où elle ne peut être contournée.
❌ Dépendance à un fournisseur. ❌ Nécessite de comprendre RLS.

## Décision

**Option C.** `server.mjs`, `mysql2`, `express`, `dotenv` et les fichiers
`.env.*.example` sont supprimés. Supabase fournit la base, l'authentification,
le stockage, les fonctions et la planification.

Le verrouillage fournisseur est réel mais limité : le cœur du projet est du
**PostgreSQL standard**. Les migrations, les politiques RLS et les fonctions
s'exécutent sur n'importe quel PostgreSQL. Seuls l'authentification, le stockage
et les Edge Functions sont spécifiques.

## Conséquences

**Positives** — environ 250 lignes de code dupliqué supprimées ; les
fonctionnalités simulées sont devenues réelles ; le déploiement se réduit à la
publication de fichiers statiques ; `npm run build && npm run preview` fonctionne
enfin (auparavant, la préversion appelait `/api/…` sans serveur pour répondre).

**Négatives** — dépendance à Supabase ; il faut Docker pour développer avec une
base locale ; l'équipe doit comprendre RLS, dont les échecs sont silencieux
(voir [ADR-002](ADR-002-rls-plutot-que-controle-applicatif.md)).

**Sur l'ancien chemin MySQL** — il est supprimé, pas déprécié. Un chemin mort
maintenu « au cas où » dans une documentation est un piège pour le lecteur
suivant. Il reste récupérable dans l'historique Git :

```bash
git log --oneline --all -- server.mjs
git show <commit>:server.mjs
```

C'est la seule trace que cette variante mérite.

## Comment revenir en arrière

Le schéma étant du PostgreSQL standard, une migration vers un PostgreSQL
autohébergé demanderait : un `pg_dump` / `pg_restore` ; le remplacement de
Supabase Auth par une autre solution (les rôles vivent déjà dans
`utilisateurs`) ; le remplacement de Storage par un stockage objet ; et la
réécriture de l'Edge Function en service Node ou en tâche cron. Les politiques
RLS, elles, se transposent sans modification.
