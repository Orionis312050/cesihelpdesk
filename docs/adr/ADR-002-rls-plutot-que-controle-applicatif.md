# ADR-002 — Sécurité par RLS plutôt que par contrôle applicatif

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

L'application est un site statique qui parle directement à l'API Supabase. La
clé d'accès est **publique** : elle figure dans le JavaScript envoyé à chaque
visiteur, et n'importe qui peut la lire dans les outils de développement puis
interroger l'API avec `curl`.

Avant cette décision, l'application n'avait aucune authentification. Le tableau
de suivi, les statistiques et la modification des tickets étaient accessibles à
tout visiteur, et les politiques en place accordaient un accès anonyme complet
à la table des tickets.

## Options envisagées

**A. Contrôle dans l'interface.** Masquer les menus, protéger les routes React.
✅ Simple. ❌ **Ne protège rien.** Les données transitent par une API publique ;
contourner l'interface prend trente secondes avec `curl`.

**B. Serveur intermédiaire portant les règles.** Une API qui vérifie les droits
et détient la clé secrète.
✅ Contrôle centralisé, familier. ❌ Réintroduit le serveur supprimé en
[ADR-001](ADR-001-supabase-plutot-que-mysql-express.md). ❌ Un oubli de
vérification sur une route ouvre une brèche silencieuse.

**C. Row Level Security dans PostgreSQL.**
✅ Les règles s'appliquent à **toute** requête, quelle qu'en soit l'origine :
interface, `curl`, ou client tiers. ✅ Impossible à oublier sur une route,
puisqu'il n'y a pas de routes. ✅ Aucun serveur à maintenir.
❌ Syntaxe à apprendre. ❌ **Les échecs sont silencieux** : une politique trop
restrictive renvoie une liste vide, pas une erreur.

## Décision

**Option C.** Toutes les tables ont RLS activé. Les droits sont définis dans
`supabase/migrations/*_rls_politiques.sql`. Les gardes-fous de l'interface
(`ProtectedRoute`, masquage des menus) sont conservés **comme confort de
lecture uniquement** — le code le dit explicitement en commentaire, pour éviter
qu'un lecteur pressé les prenne pour la mesure de sécurité.

Deux compléments nécessaires, car RLS seul ne couvre pas tout :

- **Privilèges au niveau colonne** pour limiter les champs modifiables. RLS
  raisonne par ligne, jamais par colonne : sans
  `grant update (statut, assigne_a_id, commentaire_admin)`, un technicien
  pourrait réécrire le nom du déclarant via l'API.
- **Fonctions `security definer`** (`est_admin`, `est_personnel`) pour lire le
  rôle sans déclencher de récursion infinie dans les politiques.

## Conséquences

**Positives** — la sécurité est vérifiable par une commande
(`scripts/verifier-rls.sh`) plutôt que par relecture de code ; ajouter un écran
ne peut pas créer de faille, puisque les droits ne dépendent pas de l'écran.

**Négatives et pièges rencontrés** — trois écueils réels, tous documentés dans
[03 — Base de données](../03-base-de-donnees.md) :

1. **Un refus ressemble à un succès.** Une lecture interdite renvoie `200 []` et
   une écriture interdite `204`. « Pas d'erreur donc c'est sécurisé » est
   l'inverse de la vérité. D'où le script de vérification, qui teste les deux
   sens : ce qui doit être refusé **et** ce qui doit rester autorisé.
2. **Une politique de `anon` ne doit appeler aucune fonction.** Les droits
   d'exécution sont vérifiés à la planification : une condition
   `actif or public.est_personnel()` échoue pour un visiteur anonyme avec
   « permission denied for function », même quand `actif` est vrai. Deux
   politiques distinctes sont nécessaires.
3. **`service_role` a besoin de privilèges de table explicites.** Cette clé
   contourne RLS mais pas les `GRANT` : sans eux, les Edge Functions échouent sur
   « permission denied for table tickets ».

Ces trois points ont été trouvés par le script de vérification, pas par
relecture. C'est l'argument le plus fort en faveur de l'outillage.

## Comment revenir en arrière

Il n'y a pas de retour en arrière souhaitable. Passer à un contrôle applicatif
imposerait de réintroduire un serveur détenant la clé secrète, et de vérifier
les droits sur chaque route — avec le risque d'oubli que RLS élimine par
construction.
