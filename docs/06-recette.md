# 06 — Cahier de recette

Ce document sert à trois choses : vérifier une installation, servir de scénario
de démonstration, et constituer la preuve que chaque exigence du cahier des
charges est satisfaite.

**Ordre d'exécution = ordre de démonstration.** La colonne « Preuve » se
remplit avec une capture d'écran ou une sortie de commande collée.

**Prérequis communs :** application démarrée, base contenant le jeu de
démonstration (`npm run db:reset`), un compte `admin` et un compte `technicien`
créés.

---

## R-000 — Installation depuis zéro

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-000 | Sur une machine n'ayant jamais vu le projet, suivre `docs/01-installation.md` de bout en bout | Chaque commande passe sans adaptation. L'application s'ouvre, la liste des salles est remplie | | |

Ce test valide la documentation elle-même. Il est le seul qui doit être rejoué
sur une machine vierge.

---

## R-1xx — Déclaration publique

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-101 | Ouvrir `/signaler`, remplir tous les champs, cocher un type, envoyer | Écran « Demande enregistrée » avec un numéro. L'incident apparaît dans le suivi | | |
| R-102 | Saisir uniquement le nom, puis envoyer | **Aucune fenêtre système.** Les champs manquants se bordent de rouge avec un message sous chacun, l'écran se positionne sur le premier. **Aucune ligne créée** (compter `select count(*) from tickets` avant/après). La saisie est conservée | | |
| R-103 | Saisir « pas-un-email » dans le champ Email et envoyer | Message « Cette adresse e-mail n'est pas valide. » sous le champ | | |
| R-104 | Taper « Salle Inventée » dans le champ Salle et envoyer | Message « Cette salle n'existe pas. Choisissez-en une dans la liste. » | | |
| R-105 | Taper « info » dans le champ Salle | La liste propose « Salle Informatique 1 » et « Salle Informatique 2 ». Les flèches ↑ ↓ naviguent, Entrée valide | | |
| R-106 | Envoyer une déclaration, puis en envoyer une seconde depuis l'écran de confirmation | Deux incidents distincts, deux numéros différents | | |

---

## R-2xx — Connexion et rôles

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-201 | Non connecté, ouvrir `/suivi` directement | Redirection vers `/connexion` | | |
| R-202 | Se connecter avec un mauvais mot de passe | « Adresse e-mail ou mot de passe incorrect. » Aucune redirection | | |
| R-203 | Se connecter en `admin` | Retour sur `/suivi`. Le nom apparaît en haut à droite. Les menus Suivi, Stats, QR et Salles sont visibles | | |
| R-204 | Rafraîchir la page (F5) | La session est conservée. **Aucun affichage transitoire de la page de connexion** | | |
| R-205 | Se connecter en `technicien` et ouvrir `/qr-codes`, puis `/salles` | Écran « Accès réservé » sur les deux. Les menus QR et Salles ne sont pas affichés | | |
| R-206 | Se déconnecter | Retour au formulaire public. Les menus d'administration disparaissent. `/suivi` redirige de nouveau vers la connexion | | |
| R-207 | Désactiver un compte (`update utilisateurs set actif=false …`), puis s'y connecter | La connexion aboutit mais l'espace d'administration reste inaccessible | | |

---

## R-3xx — Sécurité des données (le bloc le plus important)

**À relancer après toute migration touchant aux politiques ou aux privilèges.**

```bash
bash scripts/verifier-rls.sh
```

| ID | Contrôle | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-301 | Lecture anonyme de `tickets`, `ticket_categories`, `utilisateurs`, `email_log`, `configuration` | Refus ou tableau vide sur les cinq | | |
| R-302 | Lecture anonyme de `salles` et `categories_incident` | Autorisée — le formulaire public en dépend | | |
| R-303 | `PATCH` anonyme sur un ticket, avec `Prefer: return=representation` | Zéro ligne modifiée. **L'en-tête est obligatoire** : sans lui, un refus silencieux renvoie 204 et ressemble à un succès | | |
| R-304 | `INSERT` anonyme direct dans `tickets` | Refusé | | |
| R-305 | Appel anonyme de `creer_ticket()` | Autorisé, renvoie un numéro | | |
| R-306 | `creer_ticket()` avec e-mail invalide / salle inconnue / type inconnu | Refusé dans les trois cas | | |
| R-307 | Lecture des tickets par un administrateur connecté | Tous les incidents sont renvoyés | | |
| R-308 | Tentative de modification de `demandeur_nom` par un compte connecté | Refusée (privilège au niveau colonne) | | |
| R-309 | Inventaire : toutes les tables ont RLS ; aucune table avec RLS et sans politique (hors `configuration`, volontairement verrouillée) ; toutes les fonctions `security definer` ont un `search_path` figé | Trois contrôles verts | | |

> **Piège à retenir :** sous RLS, une lecture interdite renvoie `200 []`, pas
> `403`. « Pas d'erreur donc c'est sécurisé » est faux. C'est aussi pourquoi la
> base doit contenir des données : sur une base vide, « refusé » et « vide » sont
> indiscernables. Toujours tester avec la clé **publiable**, jamais la secrète.

---

## R-4xx — Suivi des incidents

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-401 | Ouvrir `/suivi` | Les incidents s'affichent, du plus récent au plus ancien. Les lignes à risque sont sur fond rouge | | |
| R-402 | Filtrer par statut « Terminé » | Seuls les incidents terminés restent. Le compteur « X sur Y » est cohérent | | |
| R-403 | Cumuler un filtre Statut et un filtre Lieu | Les deux s'appliquent simultanément. Le badge indique « 2 filtres » | | |
| R-404 | Saisir « electricite » sans accent dans la recherche | Les incidents « Électricité » remontent | | |
| R-405 | Copier l'adresse de la page filtrée et l'ouvrir dans un nouvel onglet | La même sélection s'affiche | | |
| R-406 | Cliquer l'en-tête « Titre », puis recliquer | Tri alphabétique croissant, puis décroissant | | |
| R-407 | Cliquer « Réinitialiser les filtres » | Tous les incidents réapparaissent, le badge disparaît | | |
| R-408 | Filtrer sur une combinaison sans résultat | « Aucun incident ne correspond aux filtres sélectionnés. » | | |
| R-409 | Changer un statut depuis la liste | Le badge change de couleur. Après F5, la valeur est conservée | | |

---

## R-5xx — Fiche d'incident

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-501 | Ouvrir `/incident/10` dans un onglet neuf | La fiche se charge sans passer par la liste | | |
| R-502 | Ouvrir une fiche depuis une liste filtrée, puis « Retour au suivi » | La liste revient **avec les filtres appliqués** | | |
| R-503 | Affecter un traitant | Seuls les comptes actifs sont proposés. Le nom apparaît dans la liste après retour | | |
| R-504 | Saisir un commentaire de suivi puis cliquer ailleurs | Enregistré automatiquement. Conservé après F5 | | |
| R-505 | Passer un incident en « Terminé » | La fiche affiche « Résolu en N jours ». Le délai moyen des statistiques est recalculé | | |
| R-506 | Ouvrir `/incident/99999` | « Incident introuvable » avec un lien de retour | | |

---

## R-6xx — Photo

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-601 | Joindre une photo de plusieurs Mo | Vignette affichée avec « X Mo → Y Ko ». Le poids final est nettement inférieur | | |
| R-602 | Envoyer la déclaration, puis ouvrir la fiche | La photo s'affiche. Un clic l'ouvre en grand | | |
| R-603 | Joindre un fichier non image (PDF) | Message d'erreur, fichier refusé | | |
| R-604 | Joindre une image de plus de 10 Mo | Message indiquant la limite | | |
| R-605 | Retirer une photo choisie puis en sélectionner une autre | La vignette est remplacée | | |
| R-606 | Copier l'URL de la photo, attendre plus d'une heure, la rouvrir | Accès refusé (l'URL signée a expiré) — comportement attendu d'un bucket privé | | |
| R-607 | Depuis un téléphone, toucher « Choisir une photo » | L'appareil photo s'ouvre directement | | |

---

## R-7xx — Notifications

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-701 | Déclarer un incident avec « Risque d'accident » coché | Ligne `type='urgent'` dans `email_log`. En mode console, l'e-mail apparaît dans les journaux de la fonction | | |
| R-702 | `select public.appeler_notifications('{"mode":"recap"}'::jsonb);` | Ligne `type='recap'`. Le message liste les incidents des 7 derniers jours et signale les risques | | |
| R-703 | Configurer un mot de passe SMTP volontairement faux, puis déclarer un incident à risque | **L'incident est bien créé.** `email_log.statut='echec'`, `erreur` contient le message SMTP. Aucune erreur visible pour le déclarant | | |
| R-704 | Vider `configuration.url_fonction_notifications`, déclarer un incident à risque | **L'incident est bien créé.** Aucune erreur affichée | | |
| R-705 | Appeler la fonction sans l'en-tête `x-secret-notifications` | HTTP 401 | | |
| R-706 | `select jobname, schedule, active from cron.job;` | `recap-hebdomadaire`, `0 6 * * 5`, actif | | |

> R-703 et R-704 vérifient la propriété la plus importante de ce module : **une
> panne de messagerie ne doit jamais faire échouer une déclaration d'incident.**

---

## R-8xx — QR codes

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-801 | Ouvrir `/qr-codes` en administrateur | L'**affiche générique** est affichée en premier, avec son aperçu et son bouton. La section « Affiches par salle » est repliée, aucune salle sélectionnée | | |
| R-802 | Avec `VITE_PUBLIC_APP_URL` non renseigné | Bandeau rouge « Ne pas imprimer en l'état » | | |
| R-803 | Aperçu avant impression | Une affiche par page A4. Ni en-tête, ni pied de page, ni commandes. Le bandeau jaune ressort | | |
| R-804 | Scanner une affiche imprimée avec un téléphone | Le formulaire s'ouvre, « Salle détectée par le QR code » affiche le bon nom | | |
| R-805 | Ouvrir `/salle/Salle%20Informatique%201` | La salle avec espaces et accents est correctement reconnue | | |
| R-806 | Depuis une page `/salle/…`, cliquer « Ce n'est pas la bonne salle ? » | Retour au formulaire avec choix libre de la salle | | |
| R-807 | Observer l'affiche générique | « Un problème sur le campus ? », bandeau jaune « Signalez-le », URL `…/signaler` sans nom de salle | | |
| R-808 | Sélectionner 3 salles, puis **Imprimer cette affiche** (affiche générique) | L'aperçu ne contient **qu'une seule page** : les 3 affiches de salle ne sont pas imprimées | | |
| R-809 | Puis **Imprimer la sélection** | L'aperçu contient **3 pages** : l'affiche générique n'est pas imprimée | | |
| R-810 | Scanner l'affiche générique | Le formulaire s'ouvre **sans** bandeau « Salle détectée », champ Salle vide et modifiable | | |
| R-811 | Déclarer un incident depuis l'affiche générique en choisissant « B204 », puis filtrer le suivi sur Lieu = B204 | L'incident apparaît. La localisation est aussi exploitable qu'avec une affiche dédiée | | |

---

## R-9xx — Statistiques

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-901 | Ouvrir `/statistiques` | L'année en cours est sélectionnée par défaut. **Aucune année n'est figée dans le code** | | |
| R-902 | Changer d'année | Tous les indicateurs et graphiques se recalculent | | |
| R-903 | Vérifier les quatre compteurs de statut | Nouveau, En cours, En attente et Terminé sont **distincts**, leur somme égale le total de l'année | | |
| R-904 | Passer un incident en Terminé, revenir aux statistiques | Le délai moyen de résolution est mis à jour | | |
| R-905 | Comparer le volume mensuel avec `select date_trunc('month', created_at), count(*) from tickets group by 1;` | Les valeurs concordent | | |
| R-906 | Consulter sur une année sans incident | Les graphiques affichent « Aucune donnée à afficher », sans erreur | | |

---

## R-Axx — Accessibilité et mobile

Le formulaire public est utilisé **sur un téléphone, debout dans une salle**.
Testez sur un vrai appareil : `npm run dev -- --host`, puis ouvrez l'adresse
`Network`. L'émulation du navigateur ne reproduit ni le clavier virtuel, ni les
cibles tactiles réelles, ni l'ouverture de l'appareil photo.

| ID | Contrôle | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-A01 | Formulaire public sur un écran 360 × 640 | Tout est lisible, rien ne déborde horizontalement | | |
| R-A02 | Parcourir le formulaire uniquement au clavier (Tab, Espace, Entrée) | Tous les champs sont atteignables, le focus reste visible en permanence | | |
| R-A03 | Champs Nom et Email sur mobile | L'autocomplétion du téléphone les propose | | |
| R-A04 | Taille des cibles tactiles (statut, icône œil, boutons) | Au moins 44 × 44 px | | |
| R-A05 | Audit Lighthouse mobile sur `/signaler` | Accessibilité ≥ 90 | | |
| R-A06 | Audit axe DevTools sur `/signaler` et `/suivi` | Aucune violation « serious » ou « critical » | | |
| R-A07 | Envoi en réseau dégradé (Slow 4G) | Le bouton passe en « ENVOI… ». En cas d'échec, **la saisie est conservée** | | |
| R-A08 | `<html lang>` | Vaut `fr` | | |

---

## R-Bxx — Gestion des salles

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-B01 | Ouvrir `/salles` en administrateur | La liste des salles s'affiche, triée par nom, avec bâtiment et état. Le compteur indique le nombre de salles | | |
| R-B02 | Ajouter « B305 », bâtiment « Bâtiment B » | Notification « Salle « B305 » ajoutée. », la ligne apparaît. Dans une fenêtre privée, `/signaler` propose « B305 » dans le champ Salle | | |
| R-B03 | Ajouter de nouveau « B305 » | Message « Une salle porte déjà ce nom. » sous le champ. Aucune ligne créée | | |
| R-B04 | Ajouter avec un nom vide | Message « Indiquez le nom de la salle. » Aucune requête envoyée | | |
| R-B05 | Renommer « B305 » en « B306 » | La liste affiche « B306 ». Un incident déclaré en B305 affiche désormais « B306 » dans le suivi | | |
| R-B06 | Désactiver « B306 » | Badge « Désactivée », ligne grisée. `/signaler` ne la propose plus. Ses incidents restent visibles dans le suivi et les statistiques | | |
| R-B07 | Ouvrir `/salle/B306` (affiche d'une salle désactivée), remplir, envoyer | Message « Cette salle n'existe pas. Choisissez-en une dans la liste. » sous le bandeau jaune. Aucune ligne créée | | |
| R-B08 | Réactiver « B306 » | Badge « Active ». `/signaler` la propose de nouveau | | |
| R-B09 | Taper « batiment b » sans accent dans la recherche | Seules les salles du bâtiment B restent affichées | | |
| R-B10 | Se connecter en `technicien`, ouvrir `/nouveau` | Le champ Salle ne propose pas les salles désactivées | | |

---

## R-Cxx — Gestion des comptes

Prérequis : un compte administrateur — `bash deploy/scripts/creer-compte-admin.sh`
(ou `scripts/creer-compte.sh` en local). Les autres comptes de la campagne se
créent par R-C13.

| ID | Étapes | Résultat attendu | OK/KO | Preuve |
| --- | --- | --- | :---: | --- |
| R-C01 | Ouvrir `/utilisateurs` en administrateur | La liste s'affiche, triée par nom, avec e-mail, rôle et état. Le compteur indique le nombre de comptes, d'administrateurs actifs et de comptes désactivés | | |
| R-C02 | Passer un technicien en « Administrateur » | Notification « … est désormais administrateur. » La liste suit. Après rechargement chez l'intéressé, les menus QR, Salles et Comptes lui apparaissent | | |
| R-C03 | Renommer ce compte | Notification de confirmation. Le nouveau nom apparaît aussitôt dans la colonne « Traitant » du suivi, sans rechargement manuel | | |
| R-C04 | Renommer avec un nom vide | Message « Le nom ne peut pas être vide. » sous le champ. Aucune écriture | | |
| R-C05 | Désactiver ce compte | Badge « Désactivé », ligne grisée. Il disparaît de la liste « Traitant » d'une fiche. Ses incidents passés portent toujours son nom | | |
| R-C06 | Se connecter avec le compte désactivé | La connexion aboutit mais l'application se comporte comme pour un visiteur : aucun incident lisible | | |
| R-C07 | Le réactiver, puis se reconnecter avec | Badge « Actif ». L'accès au suivi est rétabli | | |
| R-C08 | Sur sa propre ligne | Mention « (vous) ». La liste déroulante de rôle est remplacée par une étiquette, le bouton « Désactiver » est inerte et porte une infobulle | | |
| R-C09 | Ne laisser qu'un administrateur actif, puis tenter de le rétrograder par l'API REST (`PATCH /rest/v1/utilisateurs?id=eq.<son id>` avec `{"role":"technicien"}` et un jeton admin) | Refus de la base : « Ce compte est le dernier administrateur actif… ». Le compte reste administrateur | | |
| R-C10 | Tenter de réécrire une adresse e-mail par l'API REST (`PATCH` avec `{"email":"…"}`) | Refus : la colonne n'est pas accordée à `authenticated` | | |
| R-C11 | Taper « viacesi » dans la recherche | Seuls les comptes dont le nom ou l'adresse contient la chaîne restent affichés | | |
| R-C12 | Se connecter en `technicien`, ouvrir `/utilisateurs` | Écran « Accès réservé ». Le lien « Comptes » est absent du menu | | |
| R-C13 | Inviter « Camille Martin », `camille.martin@viacesi.fr`, rôle Technicien | Notification de création. Le compte apparaît dans la liste, actif, rôle Technicien. Un encadré affiche un lien vers `/definir-mot-de-passe#token=…` | | |
| R-C14 | Ouvrir ce lien dans une fenêtre de navigation privée, saisir deux fois le même mot de passe (≥ 8 caractères) | L'écran « Votre mot de passe » indique le compte concerné. Après enregistrement, arrivée directement sur le suivi, connecté en tant que Camille Martin | | |
| R-C15 | Rouvrir le même lien | « Ce lien a expiré ou a déjà servi. » — le jeton ne sert qu'une fois | | |
| R-C16 | Réinviter la même adresse | Message sous le formulaire : « Un compte utilise déjà cette adresse… ». Aucun doublon dans la liste | | |
| R-C17 | Bouton « Lien mot de passe » sur la ligne de Camille Martin, puis suivre le lien et choisir un autre mot de passe | Un nouveau lien s'affiche. Le nouveau mot de passe fonctionne, l'ancien non | | |
| R-C18 | Désactiver ce compte, puis regarder son bouton « Lien mot de passe » | Le bouton est inerte, avec l'infobulle « Réactivez le compte… » | | |
| R-C19 | Appeler la fonction sans en-tête `Authorization` (`curl -X POST https://<domaine>/functions/v1/comptes -H 'Content-Type: application/json' -d '{"action":"inviter","email":"x@y.fr","nom_complet":"X"}'`) | HTTP 401. Aucun compte créé | | |
| R-C20 | Rejouer le même appel avec le jeton d'un compte `technicien` | HTTP 403 « réservée aux administrateurs ». Aucun compte créé | | |

Les contrôles R-C09 et R-C10 sont automatisés par `bash scripts/verifier-rls.sh`.

---

## Traçabilité — exigences du cahier des charges

| Exigence | Où c'est vérifié |
| --- | --- |
| Champs dans l'ordre demandé, sans catégorie « Groupe » | R-101 |
| Salle en liste déroulante alphabétique avec autocomplétion | R-105 |
| Cases à cocher multi-choix pour le type d'incident | R-101 |
| Titre de l'intervention | R-101 |
| Envoi d'une photo compressée | R-601, R-602 |
| Case « Risque d'accident ou de blessure » | R-701 |
| Liste des interventions avec filtres par colonne | R-402 à R-408 |
| Quatre niveaux d'avancement | R-409, R-903 |
| Nom de la personne ayant traité le ticket | R-503 |
| Champ commentaire | R-504 |
| Lien vers la fiche complète de l'incident | R-501, R-502 |
| Exportable au format Excel | R-4xx (bouton) + ouverture du fichier |
| Histogramme du volume sur l'année | R-901, R-905 |
| Camembert des types d'incident | R-901 |
| Nombre d'incidents en cours | R-903 |
| Formulaire accessible depuis l'espace admin | `/nouveau`, guide utilisateur §2 |
| E-mail automatique hebdomadaire | R-702, R-706 |
| E-mail immédiat si « Risque » coché | R-701 |
| QR code en salle | R-801 à R-806 |
| QR code générique, hors salle | R-807 à R-809 |
