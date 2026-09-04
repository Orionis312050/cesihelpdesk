# ADR-012 — Purge des photos par une tâche planifiée appelant une fonction Edge

- **Statut :** Accepté
- **Date :** 2026-09-04

## Contexte

Une photo d'incident est utile le temps du traitement, rarement au-delà. Elle
peut montrer des personnes, du matériel ou un plan des locaux — c'est la raison
du bucket privé ([ADR-004](ADR-004-compression-image-cote-client.md)) — et elle
occupe de l'espace sur le disque de la VM, qui n'est pas extensible à volonté.

La demande : **six mois après la déclaration d'un incident, sa photo est
supprimée automatiquement.** Le signalement lui-même (description, statut,
commentaires, dates) est conservé : il alimente les statistiques.

La procédure existait déjà dans [04 — Exploitation](../04-exploitation.md),
mais à la main, en deux temps (Storage puis SQL). Une procédure manuelle sans
échéance n'est jamais exécutée.

## Options envisagées

**A. Une tâche `pg_cron` qui supprime en SQL dans `storage.objects`.**
✅ Une seule migration, aucun code hors de la base. ❌ **Ne libère pas
l'espace** : supprimer la ligne du catalogue laisse le fichier sur le disque.
Seul le service Storage, par son API, efface les deux. C'est le piège classique
de Supabase Storage, et il rendrait la fonctionnalité inutile pour la moitié de
son objectif.

**B. `pg_cron` → `pg_net` → API Storage directement.** ✅ Pas de fonction Edge.
❌ La clé de service devrait être stockée dans la base pour signer l'appel.
❌ `pg_net` est asynchrone : la base effacerait `image_chemin` sans savoir si
Storage a réellement supprimé l'objet — un échec produirait des fichiers
orphelins, invisibles et jamais nettoyés.

**C. `pg_cron` → `pg_net` → fonction Edge « maintenance ».** ✅ La clé de
service reste dans le conteneur des fonctions, où elle est déjà. ✅ La fonction
travaille dans l'ordre sûr — objets d'abord, base ensuite — et ne touche la base
qu'après la réponse de Storage. ✅ Même mécanique que le récapitulatif
hebdomadaire ([ADR-005](ADR-005-emails-declenches-en-base.md)) : secret
partagé, `net._http_response` pour le diagnostic. ❌ Une fonction de plus à
monter dans la surcouche Compose de l'instance autohébergée.

**D. Déclencher depuis le navigateur d'un administrateur.** ❌ Dépend de
quelqu'un qui se connecte ; un mois sans connexion, un mois sans purge.

## Décision

**C.** Une tâche `purge-photos`, chaque nuit à 03:30 UTC, appelle
`purger_photos_anciennes()`, qui lit la durée de conservation dans
`public.configuration` (`retention_photos_mois`, six par défaut) et appelle la
fonction « maintenance » en mode `purge_photos`. La fonction supprime les objets
par lots de 100, puis met `image_chemin` à `NULL` et horodate
`image_supprimee_le`.

Trois choix de détail :

- **Une colonne `image_supprimee_le`** plutôt que rien : sans elle, une fiche
  sans photo ne dit pas si le déclarant n'en a pas joint ou si elle a été
  purgée. La fiche affiche « Photo supprimée automatiquement le … ».
- **La durée vit en base**, pas dans une variable d'environnement : la changer
  est une requête SQL, sans redéploiement. Une valeur absurde suspend la purge
  au lieu de retomber sur six mois.
- **Un mode `simulation`** renvoie le nombre de photos concernées sans rien
  supprimer : c'est ce qu'on lance avant la première exécution réelle, et ce
  que la recette vérifie.

## Conséquences

**Positives** — l'espace disque est réellement libéré ; l'application a une
réponse concrète sur la durée de conservation des images (le formulaire
l'annonce) ; rien à faire en exploitation.

**Négatives** — une fonction Edge de plus, donc un montage de plus dans la
surcouche Compose et une URL de plus dans `configuration` ; la purge est
irréversible passé le délai de rotation des sauvegardes (`sauvegarder.sh`
conserve quatorze jours) ; le texte « six mois » figure dans le formulaire et
le guide utilisateur, à mettre à jour si la durée change.

## Comment revenir en arrière

Suspendre : `select cron.unschedule('purge-photos');`. Les photos déjà
supprimées ne reviennent pas ; celles de moins de quatorze jours sont dans les
archives de `sauvegarder.sh`. Allonger la durée :
`update public.configuration set valeur = '12' where cle = 'retention_photos_mois';`.
