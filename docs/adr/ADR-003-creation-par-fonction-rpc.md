# ADR-003 — Création d'incident par une fonction en base

- **Statut :** Accepté
- **Date :** 2026-08-05

## Contexte

Le formulaire public est atteint par scan d'un QR code, **sans connexion**. Un
visiteur anonyme doit donc pouvoir créer un incident. Mais il ne doit lire
aucun signalement : les tickets contiennent des noms, des adresses e-mail et des
descriptions de failles de sécurité du campus.

L'implémentation précédente insérait le ticket, puis ses catégories dans une
seconde requête, puis rechargeait la liste complète pour retrouver la ligne
créée. Elle reposait sur un accès anonyme total à la table.

## Options envisagées

**A. Donner à `anon` les droits INSERT et SELECT sur `tickets`.**
✅ Le code existant continue de fonctionner. ❌ **Expose tous les signalements du
campus** à quiconque possède la clé publique.

**B. INSERT seul, sans SELECT.**
✅ Rien n'est lisible. ❌ Ne fonctionne pas : `insert … returning` exige un droit
de SELECT, donc impossible de renvoyer le numéro de demande. ❌ Toujours
non atomique : le ticket et ses catégories restent deux requêtes, et une coupure
réseau entre les deux laisse un incident sans type.

**C. Fonction `security definer` accessible à `anon`.**
✅ `anon` n'a **aucun** droit sur `tickets`. ✅ Ticket et catégories insérés dans
une seule transaction. ✅ Validation côté serveur. ✅ Le numéro de demande peut
être renvoyé.
❌ Une fonction supplémentaire à maintenir. ❌ `security definer` demande de la
rigueur (`search_path` figé obligatoire).

## Décision

**Option C.** `public.creer_ticket(payload jsonb) returns bigint`, déclarée
`security definer` avec `set search_path = public, pg_temp`, et
`grant execute to anon, authenticated`.

Elle valide les champs obligatoires, la longueur du titre et du nom, le format
de l'adresse e-mail, l'existence de la salle **active** et de chaque catégorie,
puis insère le ticket et ses associations avant de renvoyer l'identifiant.

La table `tickets` n'a **aucune politique pour `anon`** — ce n'est pas un oubli,
c'est le but.

## Conséquences

**Positives** — la surface d'attaque anonyme se réduit à une seule fonction, dont
le contenu tient sur un écran et se relit intégralement ; la création est
atomique ; la validation ne dépend plus du navigateur ; l'écran de confirmation
peut enfin afficher « Votre demande n° 42 », ce que l'ancienne version ne
pouvait pas faire.

**Négatives** — toute évolution du formulaire (nouveau champ) demande une
migration en plus d'une modification de l'interface. C'est un coût réel, et
c'est aussi une garantie : le champ est validé côté serveur dès son ajout.

**Point d'attention** — `search_path` doit rester figé. Sans lui, un utilisateur
peut placer un schéma de son choix en tête du chemin de recherche et détourner
les appels de fonction exécutés avec des droits élevés. Le script de
vérification contrôle ce point sur toutes les fonctions `security definer`.

## Comment revenir en arrière

Rétablir un accès direct supposerait d'accorder INSERT **et** SELECT à `anon`,
donc d'exposer tous les signalements. À n'envisager que si la nature des données
change radicalement.
