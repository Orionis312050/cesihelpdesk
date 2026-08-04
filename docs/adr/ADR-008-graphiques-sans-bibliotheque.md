# ADR-008 — Graphiques dessinés à la main, sans bibliothèque

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

La page de statistiques demande un histogramme du volume mensuel et un
camembert des types d'incident, plus quelques indicateurs chiffrés. Deux
graphiques, aux données simples.

Le cahier des charges insiste sur quatre mots : **« Light/Simple, Ergonomique/
Intuitif, Visuel Moderne, épuré »**.

L'implémentation précédente dessinait le camembert avec un `conic-gradient` CSS
et l'histogramme avec des `<div>` de hauteur variable. Elle fonctionnait, mais
souffrait de deux défauts : les aplats CSS ne s'impriment pas, et aucun contenu
n'était accessible à un lecteur d'écran.

## Options envisagées

**A. Recharts.** ✅ Idiomatique en React, animations incluses. ❌ ~95 Ko
compressés, plus sa dépendance à D3. Pour deux graphiques, c'est disproportionné.

**B. Chart.js.** ✅ Très répandu. ❌ ~45 Ko compressés, rendu sur canvas — donc
pixelisé à l'impression et opaque aux lecteurs d'écran.

**C. Conserver le CSS existant.** ✅ Zéro octet ajouté. ❌ `conic-gradient` ne
s'imprime pas (les navigateurs suppriment les fonds par défaut). ❌ Aucun
équivalent textuel.

**D. Dessiner en SVG à la main.** ✅ Zéro dépendance. ✅ Vectoriel : net à
l'écran comme à l'impression. ✅ Chaque segment peut porter un `<title>` et le
graphique un résumé textuel. ❌ Une centaine de lignes à écrire et à maintenir.
❌ Aucune animation sophistiquée.

## Décision

**Option D.** Deux composants, `BarChart` et `DonutChart`, écrits en SVG. Environ
120 lignes au total, contre 45 à 95 Ko de dépendance.

L'anneau est construit avec `stroke-dasharray` sur des cercles concentriques —
technique standard, plus lisible et plus imprimable qu'un `conic-gradient`.

Chaque graphique fournit un **équivalent textuel** : `<title>` sur chaque
segment, et une légende masquée visuellement mais lue par les technologies
d'assistance (« Jan : 1, Fév : 0, Mar : 1… »). Un graphique sans équivalent
textuel n'existe pas pour une partie des utilisateurs.

La palette place le jaune CESI en premier, puis des teintes suffisamment
contrastées pour rester distinguables en niveaux de gris et pour les principales
formes de daltonisme.

**Calcul côté navigateur, pas de vue SQL.** Créer une vue PostgreSQL
répartirait la définition des indicateurs entre deux langages, pour un volume
qui tient sans peine en mémoire. À reconsidérer au-delà de quelques dizaines de
milliers d'incidents.

## Conséquences

**Positives** — la page de statistiques reste légère et se charge à la demande ;
les graphiques s'impriment correctement ; l'accessibilité est réelle ; aucune
mise à jour de bibliothèque à suivre.

**Négatives** — un nouveau type de graphique demande d'écrire le composant.
Si le besoin dépasse trois ou quatre types, la décision mérite d'être revue.

**Bugs corrigés au passage** — l'ancienne page comportait quatre défauts, tous
liés au fait que le calcul était mêlé au rendu : l'année était figée à `2026`
dans le code **et** dans le titre du graphique ; « Nouveau » et « En cours »
étaient additionnés dans une seule carte, masquant l'information la plus utile ;
et la carte « Total Incidents (Année) » affichait en réalité le total de tous les
temps. Le calcul est désormais isolé dans `src/utils/ticketStats.ts`, une
fonction pure prenant l'année en paramètre.

## Comment revenir en arrière

Remplacer les deux composants par une bibliothèque n'affecte que
`src/components/charts/`. `calculerStatistiques()` produit déjà des structures
neutres (`{ libelle, valeur, pourcentage }`), directement consommables par
n'importe quelle bibliothèque.
