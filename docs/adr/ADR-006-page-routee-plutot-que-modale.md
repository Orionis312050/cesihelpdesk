# ADR-006 — Fiche d'incident : page routée plutôt que fenêtre modale

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le cahier des charges demande, dans la liste des interventions, « le lien pour
accéder à la fiche complète de l'incident ».

L'application affichait cette fiche dans une **fenêtre modale**. Toute
l'application vivait à une seule adresse : quatre écrans, une seule URL, aucun
historique de navigation.

Conséquences concrètes : impossible de transmettre le lien d'un incident à un
collègue ; le bouton « retour » du navigateur quittait l'application au lieu de
fermer la fenêtre ; aucune page ne pouvait être mise en favori. La modale
n'avait par ailleurs ni piège de focus, ni fermeture par Échap, ni `aria-modal`.

Le parcours QR code impose de toute façon des URL réelles : `/salle/B204` doit
ouvrir le formulaire pré-rempli.

## Options envisagées

**A. Conserver la modale, ajouter un routeur juste pour les QR codes.**
✅ Peu de code touché. ❌ Deux mécanismes de navigation cohabitent. ❌ Ne répond
toujours pas à « le lien pour accéder à la fiche ».

**B. Routeur complet, fiche en page dédiée.**
✅ Chaque écran a son adresse. ✅ Le lien vers la fiche est un vrai lien.
✅ Historique, favoris, ouverture dans un nouvel onglet. ✅ Les problèmes
d'accessibilité de la modale disparaissent par construction.
❌ Restructuration du composant racine. ❌ Impose une réécriture SPA côté
hébergeur.

**C. Routeur complet, mais garder aussi la modale** pour un aperçu rapide.
✅ Confort d'un aperçu sans quitter la liste. ❌ Deux chemins vers le même
contenu : le second finit toujours par diverger du premier.

## Décision

**Option B.** Migration vers React Router avec `createBrowserRouter`, et
suppression de `TicketModal`.

`createBrowserRouter` plutôt que `<BrowserRouter>` pour une raison précise :
il permet d'attacher un `errorElement` à la racine, qui sert de barrière
d'erreur pour tout l'arbre. L'application n'avait aucun filet : la moindre
exception de rendu produisait une page blanche.

La fiche conserve le contexte de la liste : le lien transporte les filtres
courants dans un paramètre `retour`, et le bouton « Retour au suivi » restitue
exactement la sélection que l'utilisateur avait sous les yeux.

## Conséquences

**Positives** — l'exigence du cahier des charges est satisfaite au sens propre ;
le parcours QR code devient possible ; les écrans d'administration sont chargés
à la demande, ce qui allège d'autant le formulaire public ; une barrière
d'erreur existe enfin.

**Négatives** — l'hébergeur doit renvoyer `index.html` pour toute route inconnue,
sans quoi un accès direct à `/incident/12` renvoie une erreur 404. Un fichier
`public/_redirects` est fourni, et le point est signalé en gras dans la
procédure d'installation. C'est le piège de déploiement le plus courant de ce
type d'application.

**Effet de bord notable** — GitHub Pages ne gère pas la réécriture SPA sans
détour par un routeur à `#`. Une adresse contenant un `#` sur une affiche
imprimée en salle étant peu engageante, l'hébergement doit se faire sur
Netlify, Vercel ou Cloudflare Pages.

## Comment revenir en arrière

Aucun retour en arrière envisagé : la modale ne répond pas à l'exigence.
