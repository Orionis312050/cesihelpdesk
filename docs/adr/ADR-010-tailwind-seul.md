# ADR-010 — Tailwind seul, suppression des modules CSS inutilisés

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le projet contenait onze fichiers `*.module.css`, créés lors d'un commit de
réorganisation intitulé « Séparation du css et organisation ». **Un seul était
réellement importé** (`AdminList.module.css`). Les dix autres n'étaient
référencés nulle part.

Ils n'étaient pas seulement inertes, ils étaient trompeurs : `AppHeader.module.css`
décrivait un en-tête blanc, alors que le composant affichait un en-tête noir via
des classes Tailwind. Un lecteur qui aurait modifié ce fichier pour changer la
couleur n'aurait constaté aucun effet.

Même symptôme sur les couleurs : un objet `COLORS` était exporté depuis
`src/data/helpdesk.ts` et **jamais importé**, tandis que la valeur `#FBE800`
était écrite en dur dans dix-sept endroits répartis sur treize fichiers.

## Options envisagées

**A. Câbler les dix modules inutilisés.** ✅ Justifie le travail déjà fait.
❌ Suppose de réécrire chaque composant pour utiliser les classes plutôt que
Tailwind, sans bénéfice fonctionnel.

**B. Tout basculer en modules CSS.** ✅ Séparation nette du style et du balisage.
❌ Réécriture complète. ❌ Va à contre-courant de Tailwind v4, déjà installé et
utilisé partout.

**C. Tailwind seul, suppression des modules morts.** ✅ Une seule façon de
styler, donc pas d'ambiguïté. ✅ Moins de fichiers à lire pour comprendre un
composant. ❌ Des classes utilitaires longues dans le JSX.

## Décision

**Option C.** Les onze modules CSS ont été supprimés. Un seul a été
recréé — `QrCodesPage.module.css` — pour une raison précise : Tailwind ne couvre
pas les règles `@media print` dont les affiches ont besoin (sauts de page,
masquage de l'interface, forçage des aplats de couleur à l'impression). Le
fichier commence par un commentaire qui l'explique, afin que personne ne le
prenne pour le reste d'une convention abandonnée.

Les couleurs de la charte sont devenues des **jetons Tailwind v4**, déclarés une
seule fois dans `src/index.css` :

```css
@theme {
  --color-cesi-jaune: #FBE800;
  --color-cesi-noir: #1A1A1A;
  --color-cesi-gris: #F3F4F6;
}
```

Ce qui engendre automatiquement `bg-cesi-jaune`, `text-cesi-noir`, etc. Les
dix-sept occurrences en dur ont été remplacées ; l'objet `COLORS` a été supprimé.

**Règle retenue :** Tailwind pour tout, un module CSS uniquement pour ce que
Tailwind ne sait pas exprimer — c'est-à-dire, à ce jour, l'impression.

## Conséquences

**Positives** — changer la couleur de la charte se fait désormais à un seul
endroit ; plus de fichier de style trompeur ; onze fichiers en moins.
La configuration TypeScript (`noUnusedLocals`) rendait de toute façon ces
suppressions obligatoires pour que le projet compile.

**Négatives** — les classes utilitaires allongent le JSX. C'est le compromis
habituel de Tailwind, accepté ici parce que le projet l'utilisait déjà partout.

## Comment revenir en arrière

Les modules supprimés restent dans l'historique Git :

```bash
git log --oneline --all --diff-filter=D -- '*.module.css'
```

Rien ne s'oppose à réintroduire un module CSS pour un composant précis, à
condition qu'il soit réellement importé.
