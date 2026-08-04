# ADR-005 — E-mails déclenchés par la base, pas par le navigateur

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Deux envois sont demandés :

1. une alerte **immédiate** quand la case « Risque d'accident ou de blessure »
   est cochée ;
2. un **récapitulatif hebdomadaire** des nouveaux incidents, en fin de semaine.

L'implémentation précédente affichait un message affirmant « URGENCE : Un email
a été envoyé aux responsables de site » alors qu'aucun mécanisme d'envoi
n'existait. Le récapitulatif était un bouton « Simuler Email Hebdo ».

Un message qui affirme faussement qu'une alerte de sécurité est partie est pire
que l'absence de fonctionnalité : il crée une fausse confiance.

## Options envisagées

**Qui déclenche l'alerte ?**

**A. Le navigateur, après création réussie.** ✅ Simple, aucune extension
PostgreSQL. ❌ Si l'onglet est fermé ou le réseau coupé juste après l'envoi,
**personne n'est prévenu** — et l'utilisateur a vu une confirmation. ❌ La
fonction devient appelable par n'importe qui depuis Internet.

**B. Un déclencheur PostgreSQL appelant la fonction via `pg_net`.**
✅ L'envoi est lié à l'écriture du ticket : si la ligne existe, l'appel est
parti. ✅ Rien à faire côté navigateur. ❌ Nécessite `pg_net`. ❌ Configuration
(URL, secret) à stocker en base.

**Quel transport ?**

**C. Service tiers (Resend, SendGrid).** ✅ Une clé d'API et c'est réglé.
❌ Compte à créer par l'école, enregistrements DNS sur `cesi.fr`, dépendance
externe.

**D. Relais SMTP de l'établissement.** ✅ Aucun tiers, messages émis depuis une
vraie adresse `@cesi.fr`. ❌ Suppose d'obtenir les identifiants du service
informatique — délai de plusieurs semaines.

## Décision

**B + D.** Déclencheur `AFTER INSERT ON tickets WHEN (new.risque_accident)`
appelant une Edge Function via `pg_net` ; `pg_cron` pour le récapitulatif du
vendredi ; transport SMTP vers le relais de l'établissement.

**Un transport `console` par défaut** résout le problème de délai : la fonction
compose le message et le journalise sans l'envoyer. Toute la chaîne —
déclencheur, destinataires, gabarit HTML, planification, journalisation — est
donc développée, testée et démontrable **avant** l'obtention des identifiants.
Le passage à l'envoi réel ne demande aucune modification de code, seulement
`supabase secrets set MAIL_TRANSPORT=smtp`.

**Trois propriétés non négociables**, vérifiées en recette :

1. **Une panne de messagerie ne doit jamais faire échouer une déclaration.**
   `pg_net` est asynchrone : il met la requête en file d'attente et rend la main
   immédiatement. La transaction du ticket n'attend pas le serveur SMTP. Si les
   notifications ne sont pas configurées, la fonction émet un avertissement et
   s'arrête. Tests R-703 et R-704.
2. **Tout envoi est tracé**, succès comme échec, dans `email_log`. Sans cette
   trace, « les e-mails n'arrivent plus » est indiagnosticable.
3. **Le cas « aucun incident » est explicite.** Le récapitulatif écrit « Aucun
   nouvel incident n'a été déclaré cette semaine » plutôt que d'envoyer un
   tableau vide, qui laisserait penser à une panne.

**Sur la protection de la fonction :** elle est déployée avec
`verify_jwt = false` et protégée par un en-tête secret partagé. Vérifier le JWT
ne filtrerait personne : la clé publiable **est** un JWT valide, et elle figure
dans le JavaScript envoyé à tous les visiteurs.

## Conséquences

**Positives** — l'application ne ment plus ; l'alerte part même si l'utilisateur
ferme son téléphone aussitôt après l'envoi ; le récapitulatif ne dépend de
personne ; le projet est démontrable sans identifiants SMTP.

**Négatives** — deux extensions PostgreSQL supplémentaires ; le secret est
stocké dans une table `configuration` sans politique RLS (donc inaccessible aux
clients, mais lisible par qui possède un accès à la base — ce qui, à ce stade,
signifie déjà un accès total) ; `pg_cron` s'exécute en UTC, l'horaire dérive
d'une heure entre été et hiver, ce qui est sans conséquence pour un
récapitulatif hebdomadaire mais devait être écrit quelque part.

## Comment revenir en arrière

Basculer sur un service tiers : réécrire `_shared/courriel.ts` (une trentaine de
lignes) et changer les secrets. Le reste de la chaîne est inchangé, c'est
précisément le rôle de cette séparation.

Suspendre les envois : `select cron.unschedule('recap-hebdomadaire');` et
`alter table tickets disable trigger trg_incident_urgent;`.
