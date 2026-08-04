-- Extensions et types de base.
--
-- pg_net  : appels HTTP sortants depuis Postgres (déclenchement des Edge Functions).
-- pg_cron : planification du récapitulatif hebdomadaire.
-- Les deux sont utilisés en phase « notifications » ; ils sont créés ici pour que
-- le schéma soit installable en une seule passe.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Statut d'un ticket.
--
-- Les valeurs sont volontairement identiques aux clés utilisées côté application
-- (`src/types/helpdesk.ts`). L'ancien schéma stockait du français accentué en
-- minuscules (« terminé »), ce qui obligeait à maintenir une fonction de
-- conversion avec suppression des accents en double, côté client et côté serveur.
-- Un type énuméré supprime ce point de fragilité : la base refuse désormais toute
-- valeur inconnue au lieu de la ramener silencieusement à « nouveau ».
--
-- Les libellés affichés à l'utilisateur (« En cours »…) restent définis une seule
-- fois côté application, dans `src/data/helpdesk.ts`.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'statut_ticket') then
    create type public.statut_ticket as enum ('NOUVEAU', 'EN_COURS', 'EN_ATTENTE', 'TERMINE');
  end if;
end
$$;
