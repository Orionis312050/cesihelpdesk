# ADR-004 — Compression des photos dans le navigateur, bucket privé

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le cahier des charges demande « l'envoi d'une photo (format compressée !!) ».
Le double point d'exclamation traduit une préoccupation concrète : une photo
prise au téléphone pèse 3 à 8 Mo, et le Wi-Fi d'une salle de cours est souvent
médiocre.

L'implémentation précédente ne compressait rien et n'envoyait rien : elle
stockait le **nom du fichier** dans la colonne prévue pour l'image.

## Options envisagées

**Où compresser ?**

**A. Ne pas compresser.** ❌ Envoi lent depuis un téléphone, stockage consommé
inutilement — une photo de vidéoprojecteur cassé n'a pas besoin de 12 mégapixels.

**B. Compresser côté serveur.** ✅ Impossible à contourner. ❌ L'image circule
d'abord en pleine taille, ce qui ne résout pas le problème principal. ❌ Impose
un traitement d'image côté serveur.

**C. Compresser dans le navigateur, avant l'envoi.** ✅ Ne transmet que le
strict nécessaire (3 Mo → ~200 Ko). ✅ Retour immédiat pour l'utilisateur.
❌ **Ne constitue pas une protection** : un client modifié peut envoyer ce qu'il
veut.

**Où stocker ?**

**D. Bucket public.** ✅ Affichage trivial, URL permanente. ❌ Toute photo devient
accessible à qui devine une URL, sans authentification ni trace.

**E. Bucket privé, URL signées.** ✅ Lecture réservée au personnel connecté.
❌ Cinq lignes de code de plus, et les URL expirent.

## Décision

**C + E.** Compression dans le navigateur (`createImageBitmap` puis canvas,
1600 px sur le plus grand côté, JPEG qualité 0,80), envoi dans le bucket privé
`incidents`, affichage par URL signée valable une heure.

**La compression est un confort d'usage, jamais une mesure de sécurité.** Les
limites réelles sont posées sur le bucket, côté serveur : 2 Mio maximum, types
`image/jpeg`, `image/png`, `image/webp` uniquement. Le code le dit
explicitement, pour qu'aucun lecteur ne prenne la compression pour un filtre.

Deux choix de détail qui comptent :

- **`imageOrientation: 'from-image'`** lors du décodage. Sans cette option, les
  photos prises en mode portrait arrivent couchées : l'orientation EXIF n'est pas
  appliquée au dessin sur canvas. C'est le défaut le plus courant de ce type de
  fonctionnalité.
- **Compression à la sélection, envoi à la validation.** Envoyer immédiatement
  ferait gagner une demi-seconde perçue, au prix d'un fichier orphelin pour
  chaque formulaire abandonné, d'une tâche de nettoyage à écrire, et d'un droit
  de suppression anonyme à ouvrir sur le bucket.

Le bucket étant privé, `tickets.image_chemin` stocke le **chemin de l'objet**,
jamais une URL : une URL signée enregistrée en base afficherait une image cassée
une heure plus tard.

## Conséquences

**Positives** — envoi rapide même en réseau dégradé ; le champ affiche le gain
(« 2,4 Mo → 210 Ko »), ce qui rassure ; les photos ne sont pas énumérables ;
réponse défendable en matière de RGPD, une photo de salle pouvant montrer des
personnes.

**Négatives** — le calcul se fait sur l'appareil, donc perceptible sur un
téléphone ancien (l'interface affiche « Compression en cours… ») ; les URL
signées expirent, une adresse d'image copiée ne fonctionne pas indéfiniment —
comportement attendu, testé en R-606.

**Testabilité** — le calcul des dimensions est extrait dans une fonction pure
`computeTargetDimensions(largeur, hauteur, maxCote)`, testable sans navigateur.
La partie canvas, non testable hors navigateur, est réduite au minimum.

## Comment revenir en arrière

Passer en bucket public : mettre `public = true` sur le bucket et remplacer
`createSignedUrl` par `getPublicUrl`. À ne faire qu'après une analyse RGPD.
Augmenter la qualité : ajuster `TAILLE_MAX_PX` et `QUALITE_JPEG` dans
`src/utils/imageCompression.ts`, sans oublier de relever la limite du bucket.
