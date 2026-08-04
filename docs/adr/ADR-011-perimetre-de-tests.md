# ADR-011 — Périmètre de tests volontairement restreint

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le projet ne comportait aucun test, aucun lanceur de tests et aucune intégration
continue. Les seuls garde-fous étaient `npm run lint` et `npm run build`.

La question s'est posée d'ajouter une suite de tests unitaires, et jusqu'où
aller.

## Options envisagées

**A. Aucun test.** ✅ Aucun temps investi. ❌ Aucune protection contre les
régressions. ❌ Absence remarquée dans une évaluation.

**B. Suite complète : unitaires + composants + bout en bout (Playwright).**
✅ Couverture maximale. ❌ Plusieurs jours de mise en place et d'entretien.
❌ Les tests de bout en bout sont fragiles et lents. ❌ Hors de proportion pour
environ 2 000 lignes.

**C. Vérification ciblée de ce qui est réellement risqué, et code organisé pour
que les tests unitaires soient faciles à ajouter ensuite.**
✅ L'effort va là où le risque est. ❌ Pas de filet automatique sur les
régressions de logique pure.

## Décision

**Option C**, avec un raisonnement explicite sur *où* se trouve le risque.

**La partie la plus dangereuse de cette application n'est pas couvrable par des
tests unitaires.** Une politique RLS trop permissive expose les données de tout
un campus, et aucun test unitaire ne le détecte : il faut interroger la vraie
base, avec une vraie clé publique, en distinguant « refusé » de « vide » — un
refus renvoyant `200 []` et non une erreur.

D'où **`scripts/verifier-rls.sh`** : 22 contrôles exécutés contre la base réelle,
qui vérifient les deux sens — ce qui doit être refusé (lecture anonyme des
tickets, de l'annuaire, du journal des e-mails ; écriture directe ; modification
d'une colonne protégée) **et** ce qui doit rester autorisé (lecture des salles,
création d'incident par un visiteur anonyme, lecture par le personnel).

Ce script a détecté trois défauts réels pendant le développement, qu'aucune
relecture n'avait vus :

1. une politique appelant `est_personnel()` pour le rôle `anon`, qui cassait le
   formulaire public alors que la logique semblait correcte ;
2. l'absence de privilèges de table pour `service_role`, qui faisait échouer les
   Edge Functions ;
3. la vérification que les colonnes non modifiables sont bien refusées.

**Le code a par ailleurs été organisé pour que les tests unitaires soient
triviaux à ajouter.** Tout ce qui mérite d'être testé est déjà isolé en
fonctions pures dans `src/utils/` et `src/services/excelExport.ts`, sans React,
sans réseau et sans DOM :

| Fonction | Ce qu'un test protégerait |
| --- | --- |
| `ticketsVersLignes` | Libellés français et non clés techniques, « Oui/Non », ordre des colonnes |
| `filtrerTickets` | Cumul des critères, recherche insensible aux accents, filtres vides |
| `calculerStatistiques` | Statuts **disjoints**, année respectée — les deux bugs corrigés |
| `computeTargetDimensions` | Portrait, paysage, image déjà petite (pas d'agrandissement) |
| `buildReportUrl` / `parseRoomParam` | Aller-retour sur « Salle Informatique 1 » |

Ce n'est pas un hasard : cette organisation en fonctions pures est ce qui rend
le code lisible et reprenable, que les tests existent ou non. Les tests en sont
le bénéfice, pas la seule justification.

Ajouter Vitest et couvrir ces cinq fonctions représente environ une journée.
C'est le chantier n° 2 de la liste « pour la suite »
([02 — Architecture](../02-architecture.md#six-chantiers-pour-la-suite)).

**Complément retenu :** le [cahier de recette](../06-recette.md), 60 contrôles
manuels traçant chaque exigence du cahier des charges. Il sert simultanément de
protocole de vérification, de scénario de démonstration et de preuve de
couverture — trois usages pour un seul document.

## Conséquences

**Positives** — l'effort de vérification porte sur le risque réel ; la sécurité
se contrôle par une commande ; le code est prêt à recevoir des tests.

**Négatives** — une régression sur une fonction pure (un filtre, un calcul) ne
serait pas détectée automatiquement. Le risque est réel mais borné : ces
fonctions sont courtes, sans effet de bord, et leurs défauts sont visibles à
l'écran.

**Explicitement écarté** — Playwright ou Cypress : pour cette taille de projet,
le cahier de recette apporte une meilleure preuve à une fraction du coût. Les
tests de capture d'écran (« snapshots ») : ils vieillissent mal et finissent
mis à jour sans être lus. Les seuils de couverture : ils encouragent à tester ce
qui est facile plutôt que ce qui est risqué.

## Comment revenir en arrière

```bash
npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react
```

Puis ajouter les scripts `test` et `test:run`, et écrire les fichiers `.test.ts`
à côté des modules concernés. Aucune restructuration n'est nécessaire.
