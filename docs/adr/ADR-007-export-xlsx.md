# ADR-007 — Export `.xlsx` réel plutôt que CSV renommé

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le cahier des charges demande une liste « exportable au format Excel ».

L'implémentation précédente proposait un bouton « Exporter Excel » qui produisait
en réalité un fichier **CSV** séparé par des points-virgules, avec trois défauts :

- extension `.csv`, alors que le bouton annonçait Excel ;
- les statuts exportés étaient les clés techniques (`EN_COURS`) et non les
  libellés (« En cours ») ;
- aucune marque d'ordre des octets : Excel en français affichait
  « Ã‰lectricitÃ© » à la place de « Électricité ».

## Options envisagées

**A. Corriger le CSV** (ajouter la marque d'ordre des octets, traduire les
statuts, renommer le bouton).
✅ Quelques lignes, aucune dépendance. ❌ Reste un CSV : pas de mise en forme,
pas de colonnes typées, les dates se trient comme du texte. ❌ La marque d'ordre
des octets contourne le problème d'encodage au lieu de le supprimer.

**B. `xlsx` (SheetJS).** ✅ La bibliothèque la plus connue.
❌ Deux avis de sécurité non corrigés sur la distribution npm. Une sortie
`npm audit` chargée n'est pas ce qu'on souhaite dans un rendu évalué.

**C. `exceljs`.** ✅ Très complet, bien maintenu. ❌ Volumineux, conçu pour Node,
plus lourd que nécessaire pour un simple export tabulaire.

**D. `write-excel-file`.** ✅ Environ 20 Ko compressés, prévu pour le navigateur.
✅ Colonnes typées, styles, ligne figée. ✅ Aucun avis de sécurité.
❌ Moins connu.

## Décision

**Option D.** Export `.xlsx` réel via `write-excel-file`, **chargé
dynamiquement** : la bibliothèque n'est téléchargée qu'au premier export et
n'entre jamais dans le bundle du formulaire public, ouvert depuis un téléphone.

Le fichier comporte treize colonnes, en-têtes en français sur fond jaune CESI,
ligne d'en-tête figée, libellés de statut lisibles, « Oui / Non » pour le risque,
et des cellules de type Date pour les dates.

**L'export porte sur la sélection filtrée**, pas sur la totalité : un export qui
ignore les filtres qu'on vient d'appliquer est une source d'erreur.

Le format `.xlsx` fait **disparaître** le problème d'encodage plutôt que de le
contourner : c'est un format binaire dont l'encodage est spécifié, là où le CSV
laisse chaque tableur deviner.

## Conséquences

**Positives** — le bouton dit ce qu'il fait ; les accents sont corrects sans
artifice ; les dates se trient comme des dates ; l'ajout d'environ 20 Ko ne pèse
que sur les écrans d'administration.

**Négatives** — une dépendance de plus ; un export très volumineux se ferait
dans le navigateur, ce qui bloquerait brièvement l'interface (sans conséquence à
l'échelle de quelques milliers de lignes).

**Testabilité** — la transformation des tickets en lignes est isolée dans
`ticketsVersLignes()`, une fonction pure. C'est elle qui garantit les libellés
français plutôt que les clés techniques, et c'est le premier test à écrire si
des tests sont ajoutés.

## Comment revenir en arrière

Changer de bibliothèque n'affecte que `src/services/excelExport.ts` :
`ticketsVersLignes()` est indépendante du format de sortie.
