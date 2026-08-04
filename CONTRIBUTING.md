# Contribuer au projet

## Premier lancement

Voir [docs/01-installation.md](docs/01-installation.md).

## Conventions de code

| Élément | Règle | Exemple |
| --- | --- | --- |
| Textes affichés, erreurs, JSDoc | français | « Impossible de charger les incidents. » |
| Variables et fonctions | français, `camelCase` | `filtrerTickets`, `calculerStatistiques` |
| Composants et fichiers | anglais, `PascalCase` | `IncidentListPage.tsx` |
| Tables et colonnes | français, `snake_case` | `demandeur_nom`, `risque_accident` |
| Ponctuation | pas de point-virgule, guillemets simples, indentation de 2 espaces | |

**Séparation des responsabilités** — c'est la règle la plus importante :

- `src/utils/` : fonctions **pures**. Aucun React, aucun appel réseau. C'est ce
  qui les rend testables et réutilisables.
- `src/services/` : tout ce qui touche au réseau ou à Supabase.
- `src/components/` et `src/pages/` : affichage. **Un composant n'appelle jamais
  Supabase directement** — il passe par un service ou un contexte.

Les composants sont des exports nommés (`export const X = …`), avec une interface
`XProps` déclarée juste au-dessus. Seul le routeur fait exception.

**Contextes React :** le contexte, le fournisseur et le hook vont dans **trois
fichiers distincts**. La règle `react-refresh/only-export-components` refuse
qu'un même fichier exporte un composant et autre chose.

## Convention de commit

Gitmoji suivi d'un message en français, à l'impératif :

```text
:sparkles: Ajout des filtres par colonne sur le suivi
:bug: Correction de la salle non pré-remplie après un scan
:memo: Mise à jour de la procédure d'installation
:lipstick: Alignement des cartes de statistiques
:recycle: Extraction du calcul des statistiques dans un module pur
```

## Ajouter une migration

```bash
npx supabase migration new <nom_explicite>
# éditer le fichier créé dans supabase/migrations/
npm run db:reset                 # rejoue tout depuis zéro, en local
bash scripts/verifier-rls.sh     # OBLIGATOIRE si la migration touche aux droits
```

**Ne modifiez jamais une migration déjà appliquée** : ajoutez-en une nouvelle.
Modifier un fichier déjà joué crée une divergence silencieuse entre le dépôt et
la base de production.

Toute migration touchant aux politiques ou aux privilèges se termine par
l'exécution de `scripts/verifier-rls.sh`. Sans exception : les erreurs de RLS
sont silencieuses, une lecture interdite renvoyant `200 []` et non une erreur.

## Ajouter un écran

1. Créer `src/pages/<Nom>/<Nom>.tsx`.
2. Déclarer la route dans `src/routes/router.tsx`. Un écran d'administration se
   place sous `<ProtectedRoute />` et se charge en `lazy` — le formulaire public,
   ouvert depuis un téléphone, ne doit pas télécharger le code de
   l'administration.
3. Ajouter le lien dans `AppHeader` si l'écran doit être atteignable au menu.

**Rappel :** placer un écran derrière `<ProtectedRoute />` ne protège **aucune
donnée**. La protection vient des politiques RLS. Si l'écran expose de nouvelles
données, vérifiez d'abord les politiques.

## Ajouter un test

Il n'y a pas encore de lanceur de tests — voir
[ADR-011](docs/adr/ADR-011-perimetre-de-tests.md) pour le raisonnement.

Pour en ajouter :

```bash
npm i -D vitest jsdom @testing-library/react
```

Puis un fichier `<module>.test.ts` à côté du module. Commencez par `src/utils/` :
ces fonctions sont pures et se testent sans DOM ni base de données.

## Documentation

La documentation rédigée vit dans `docs/*.md` et **est versionnée**.
`docs/api/` est généré par TypeDoc (`npm run docs`) et **n'est pas versionné** :
ne l'éditez jamais à la main.

Documentez en JSDoc les symboles exportés de `src/utils/` et `src/services/` —
c'est là qu'on cherche une signature. Inutile d'annoter chaque composant.

Commentez le **pourquoi**, pas le **quoi**. `// incrémente le compteur` n'apporte
rien ; « les droits d'exécution sont vérifiés à la planification, d'où deux
politiques distinctes » évite à la personne suivante de refaire l'erreur.

## Avant de pousser

```bash
npm run lint && npm run build
```

Et si la base a changé :

```bash
bash scripts/verifier-rls.sh
```
