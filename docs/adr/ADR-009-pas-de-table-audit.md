# ADR-009 — Pas de table d'historique générique

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Les outils de ticketing comparables, GLPI en particulier, tiennent un historique
complet : chaque changement de statut, chaque affectation et chaque commentaire
est horodaté et attribué à son auteur.

La question s'est posée d'ajouter une table `ticket_historique` alimentée par
des déclencheurs.

## Options envisagées

**A. Table d'historique complète.** ✅ Traçabilité totale, « qui a fait quoi et
quand ». ✅ Permet des statistiques plus fines. ❌ Déclencheurs sur chaque
colonne suivie. ❌ Croissance rapide de la base. ❌ Données personnelles à
conserver et à purger (RGPD). ❌ **Sans interface pour la consulter, elle ne sert
à rien** — et cette interface est un chantier à part entière.

**B. Colonnes d'audit sur `tickets`** (`modifie_par`, `modifie_le`).
✅ Très peu coûteux. ❌ Ne conserve que la dernière modification, ce qui répond
mal à la question posée.

**C. Aucun historique, sauf pour les e-mails.**
✅ Schéma simple. ✅ Ce qui est vraiment nécessaire au dépannage est conservé.
❌ Impossible de savoir qui a changé un statut.

## Décision

**Option C.** Pas de table d'historique générique. En revanche, une table
**`email_log`** étroite (une dizaine de lignes de SQL) enregistre chaque tentative
d'envoi : type, destinataires, statut, message d'erreur, horodatage.

La distinction est délibérée. `email_log` n'est pas un audit : c'est le seul
moyen de répondre à « les e-mails n'arrivent plus », une panne autrement
totalement invisible — l'envoi étant asynchrone, un échec SMTP ne laisserait
aucune trace nulle part.

Deux informations d'historique sont par ailleurs conservées, parce qu'elles
alimentent des indicateurs demandés : `tickets.resolu_le` (horodaté par
déclencheur au passage en « Terminé ») et `tickets.assigne_a_id`.

## Conséquences

**Positives** — schéma compréhensible d'un coup d'œil ; pas de croissance
parasite ; pas de données personnelles supplémentaires à justifier au titre du
RGPD ; l'effort a servi aux fonctionnalités demandées plutôt qu'à une table que
personne n'aurait consultée.

**Négatives** — impossible de savoir qui a modifié un statut, ni quand. Si le
service technique le demande — désaccord sur un délai de traitement, besoin de
justifier une intervention — il faudra l'ajouter.

**Ce que coûterait l'ajout ultérieur :** une table
`ticket_historique(ticket_id, champ, ancienne_valeur, nouvelle_valeur, auteur_id, modifie_le)`,
un déclencheur `AFTER UPDATE` sur `tickets`, une politique de lecture réservée
au personnel, une section « Historique » sur la fiche, et une tâche de purge.
Environ deux jours. Rien dans l'architecture actuelle ne s'y oppose.

## Comment revenir en arrière

Aucune migration de données n'est nécessaire : l'historique commencerait à la
date d'activation. C'est précisément ce qui rend ce report peu risqué.
