# 05 — Guide utilisateur

Deux parties : la première pour toute personne qui constate un problème dans une
salle, la seconde pour le service technique.

---

# Partie 1 — Je signale un incident

*Étudiants, enseignants, personnel — aucun compte n'est nécessaire.*

## Scanner le QR code de la salle

Un QR code est affiché près de la porte de chaque salle. Ouvrez l'appareil photo
de votre téléphone et visez-le : le formulaire s'ouvre avec **la salle déjà
renseignée**.

Pas de QR code sous la main ? Ouvrez directement l'adresse du helpdesk et
choisissez la salle dans la liste : tapez les premières lettres, les
propositions s'affichent au fur et à mesure.

## Remplir la déclaration

Les champs marqués d'une astérisque sont obligatoires.

| Champ | À indiquer |
| --- | --- |
| **Nom & Prénom** | Pour vous recontacter si besoin |
| **Email** | Adresse à laquelle on peut vous joindre |
| **Salle** | Pré-remplie si vous avez scanné le QR code |
| **Type d'incident** | Une ou plusieurs cases. Dans le doute, cochez « Autre » |
| **Titre** | Une ligne qui résume : « Vidéoprojecteur hors service » |
| **Commentaires** | Ce que vous constatez, et depuis quand si vous le savez |

Un conseil sur le titre : il figure dans la liste que consulte le service
technique. « Néon du fond qui clignote » est plus utile que « problème salle ».

Si vous oubliez un champ obligatoire, il se borde de rouge avec l'explication
juste en dessous, et l'écran se positionne dessus. **Rien n'est envoyé et rien
n'est perdu.**

## Ajouter une photo

Touchez **Choisir une photo**. Sur téléphone, l'appareil photo s'ouvre
directement : vous photographiez le problème sans quitter le formulaire.

L'image est **automatiquement compressée** avant l'envoi — l'écran affiche le
gain, par exemple « 2,4 Mo → 210 Ko ». C'est ce qui rend l'envoi rapide même
avec une mauvaise connexion. La qualité reste largement suffisante.

Une seule photo par déclaration. Pour la remplacer, touchez la croix puis
choisissez-en une autre.

## Cocher « Risque d'accident ou de blessure »

Cochez cette case **uniquement** si la situation présente un danger immédiat :

- fil électrique dénudé, prise arrachée ;
- garde de protection manquante sur une machine ;
- porte coupe-feu bloquée, issue de secours condamnée ;
- sol glissant, verre brisé, objet susceptible de tomber.

Cocher la case déclenche l'envoi immédiat d'une alerte par e-mail aux
responsables du site.

> ⚠️ **En cas d'urgence vitale — fumée, blessure, odeur de gaz — appelez les
> secours et prévenez l'accueil. N'utilisez pas ce formulaire :** il est relevé
> pendant les heures ouvrées, pas en temps réel.

## Après l'envoi

Un écran de confirmation affiche votre **numéro de demande** (« n° 42 »).
Notez-le : c'est la référence qui permet au service technique de retrouver
immédiatement votre signalement si vous les appelez.

Vous n'avez rien d'autre à faire. Vous serez recontacté par e-mail seulement si
des précisions sont nécessaires.

## Questions fréquentes

**Dois-je créer un compte ?** Non, jamais, pour signaler un incident.

**Puis-je suivre l'avancement ?** Pas directement. Contactez le service
technique avec votre numéro de demande.

**Quelqu'un a déjà signalé le même problème.** Signalez-le quand même : un
doublon coûte moins cher qu'un incident oublié parce que chacun a supposé qu'un
autre s'en chargeait.

**Je me suis trompé de salle.** Renvoyez une déclaration avec la bonne salle en
mentionnant l'erreur dans les commentaires.

**Le formulaire indique que la salle n'existe pas.** Le nom saisi ne correspond
à aucune salle enregistrée. Choisissez une proposition de la liste plutôt que de
taper le nom en entier.

**J'ai fermé la page avant de noter mon numéro.** Ce n'est pas grave, la
déclaration est enregistrée. Donnez la salle et la date au service technique.

---

# Partie 2 — Je traite les incidents

*Service technique — connexion requise.*

## Se connecter

Cliquez sur **Connexion** en haut à droite et saisissez vos identifiants
professionnels. Votre compte est créé par un administrateur.

Une fois connecté, trois menus supplémentaires apparaissent : **Suivi**,
**Stats**, et **QR** (administrateurs seulement).

## Lire le tableau de suivi

Le tableau liste tous les incidents, du plus récent au plus ancien.

| Colonne | Contenu |
| --- | --- |
| Date | Jour et heure de la déclaration |
| Titre | Résumé, numéro de demande et nom du déclarant |
| Lieu | Salle concernée |
| Type | Catégories cochées |
| Statut | Modifiable directement dans la liste |
| Traitant | Agent affecté |
| Risque | ⚠ si un risque d'accident a été signalé |
| Fiche | Ouvre le détail complet |

**Les lignes sur fond rouge signalent un risque d'accident.** Elles sont à
traiter en priorité.

## Filtrer et rechercher

Sous les en-têtes, une ligne de filtres permet d'affiner colonne par colonne :

- **Date** : deux champs, début et fin de période ;
- **Titre** : recherche libre — elle porte aussi sur la description, le nom du
  déclarant et le numéro de demande, et ignore les accents (« electricite »
  trouve « Électricité ») ;
- **Lieu**, **Type**, **Statut**, **Traitant** : listes à cocher, plusieurs
  valeurs possibles ;
- **Risque** : Oui / Non.

Les filtres se cumulent. Un compteur indique le nombre de filtres actifs, et le
bouton **Réinitialiser les filtres** les efface tous.

Cliquez sur un en-tête de colonne pour trier ; recliquez pour inverser l'ordre.

> **Astuce :** les filtres sont inscrits dans l'adresse de la page. Vous pouvez
> mettre une vue en favori (« mes incidents en cours ») ou en transmettre le
> lien à un collègue : il verra exactement la même sélection.

## Ouvrir une fiche

Cliquez sur le titre ou sur l'icône œil. La fiche affiche l'ensemble des
informations : coordonnées du déclarant, date, salle, types, description
complète, photo jointe, et le temps écoulé depuis la déclaration ou le délai de
résolution.

L'adresse de la fiche est un lien direct, transmissible par e-mail ou par
message.

Le bouton **Retour au suivi** ramène à la liste **avec les filtres que vous
aviez appliqués**.

## Changer un statut

Depuis la liste ou depuis la fiche. Quatre niveaux :

| Statut | Quand l'utiliser |
| --- | --- |
| **Nouveau** | Déclaré, pas encore examiné |
| **En cours** | Un agent s'en occupe |
| **En attente** | Bloqué : pièce à commander, intervenant externe, accès impossible |
| **Terminé** | Résolu |

La distinction **En cours / En attente** est celle qui rend les statistiques
utiles : elle sépare ce sur quoi on travaille de ce qui attend un tiers.

Le passage en **Terminé** enregistre automatiquement la date de résolution, qui
alimente le délai moyen affiché dans les statistiques. Revenir en arrière efface
cette date.

## Affecter un traitant

Sur la fiche, liste déroulante **Traitant**. Elle ne propose que des comptes
actifs — impossible d'affecter un incident à quelqu'un qui a quitté le service.

## Rédiger le commentaire de suivi

Champ **Commentaire de suivi** sur la fiche. Notez-y ce qui a été fait : pièce
commandée, entreprise contactée, date d'intervention prévue.

L'enregistrement est automatique lorsque vous quittez le champ.

C'est ce commentaire qui permet à un collègue de reprendre le dossier sans vous
appeler. « Vanne thermostatique commandée le 12/03, livraison annoncée sous
15 jours » vaut mieux que « en attente ».

## Exporter vers Excel

Bouton **Exporter (.xlsx)** en haut du tableau.

Le fichier contient **exactement la sélection affichée** : filtrez d'abord, puis
exportez. Treize colonnes, avec les libellés en français, les dates au format
date (donc triables comme telles), et la ligne d'en-tête figée.

## Lire les statistiques

Menu **Stats**. Le sélecteur d'année en haut à droite ne propose que les années
comportant des incidents.

**Première ligne** — nombre d'incidents de l'année, incidents à traiter, en
cours, et alertes de risque.

**Deuxième ligne** — délai moyen de résolution, incidents ouverts et leur
ancienneté moyenne, incidents ouverts depuis plus de 30 jours (à relancer en
priorité), et tendance sur sept jours comparée à la semaine précédente.

**Graphiques** — volume mensuel, répartition par type, salles les plus touchées,
et répartition par statut.

Deux lectures utiles : les **salles les plus touchées** identifient un
équipement à remplacer plutôt qu'à réparer indéfiniment ; les **ouverts de plus
de 30 jours** repèrent les dossiers oubliés.

## Imprimer les QR codes

*Administrateurs uniquement.* Menu **QR**.

**Dans la très grande majorité des cas, une seule affiche suffit.** La page
s'ouvre directement sur l'**affiche générique** : son aperçu est visible, et le
bouton **Imprimer cette affiche** sort une page A4, prête à être photocopiée et
collée partout. Son QR code n'est rattaché à aucune salle — le déclarant choisit
la localisation dans la liste au moment du signalement.

Cela n'appauvrit pas les données : la salle est choisie dans une liste
contrôlée, donc les filtres, l'export et les statistiques par salle restent
exactement aussi exploitables qu'avec une affiche dédiée.

**Les affiches par salle** sont dans la section repliée « Affiches par salle ».
Leur QR code renseigne la salle automatiquement, ce qui évite au déclarant de la
choisir. Utile pour une salle sensible ou dont le nom prête à confusion.
Sélectionnez les salles voulues, puis **Imprimer la sélection**.

Les deux boutons impriment indépendamment : imprimer l'affiche générique ne sort
pas les affiches de salle, et inversement.

Un bandeau rouge s'affiche si l'application n'est pas correctement configurée
pour l'impression : dans ce cas, **n'imprimez pas**, les codes seraient
inutilisables. Signalez-le à la personne qui gère l'application.

## Ce que je reçois par e-mail

**Alerte immédiate** — dès qu'un incident est déclaré avec la case « Risque
d'accident » cochée. Elle contient la salle, le titre, la description, les
coordonnées du déclarant et un lien direct vers la fiche.

**Récapitulatif hebdomadaire** — le vendredi matin. Liste des incidents déclarés
dans la semaine, avec les risques signalés en évidence. S'il n'y a eu aucun
incident, l'e-mail le dit explicitement : recevoir un tableau vide sans
explication laisserait penser à une panne.

## Saisir un incident à la place de quelqu'un

Un signalement arrive par téléphone ou de vive voix ? Utilisez l'adresse
`/nouveau` (accessible une fois connecté) : c'est le même formulaire, et
l'incident rejoint le tableau de suivi comme les autres.
