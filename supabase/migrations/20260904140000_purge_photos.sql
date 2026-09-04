-- Purge automatique des photos d'incident.
--
-- Une photo prise dans une salle peut montrer des personnes : elle n'a pas
-- vocation à être conservée indéfiniment (minimisation, RGPD), et elle occupe
-- de l'espace sur le disque de la VM. Passé un délai — six mois par défaut —
-- la photo est retirée du bucket ; la fiche conserve tout le reste.
--
-- POURQUOI PASSER PAR LA FONCTION EDGE « maintenance » ET PAS PAR DU SQL SEUL :
-- supprimer une ligne de storage.objects en SQL retire l'entrée du catalogue
-- mais laisse le fichier sur le disque — l'espace n'est pas libéré. Seul le
-- service Storage, appelé par son API, efface les deux. La tâche pg_cron se
-- contente donc d'appeler la fonction, qui détient la clé de service, supprime
-- les objets par l'API puis efface le chemin en base. Même mécanique que le
-- récapitulatif hebdomadaire (pg_cron → pg_net → fonction), même secret.

-- ---------------------------------------------------------------------------
-- 1. Configuration
--
-- L'URL de la fonction (interne au réseau Docker sur l'instance autohébergée)
-- et la durée de conservation. Le secret est celui déjà partagé avec
-- « notifications » : les fonctions tournent dans le même conteneur, avec le
-- même FUNCTION_SECRET.
-- ---------------------------------------------------------------------------
insert into public.configuration (cle, valeur) values
  ('url_fonction_maintenance', ''),
  ('retention_photos_mois', '6')
on conflict (cle) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Trace de la purge sur la fiche
--
-- Sans cette colonne, une fiche sans photo ne dit pas si le déclarant n'en a
-- pas joint ou si elle a été purgée : un agent y verrait une anomalie.
-- Écrite par la fonction (clé de service) uniquement : le GRANT au niveau
-- colonne de `tickets` ne l'accorde pas à `authenticated`.
-- ---------------------------------------------------------------------------
alter table public.tickets add column if not exists image_supprimee_le timestamptz;

comment on column public.tickets.image_supprimee_le is
  'Renseigné par la purge automatique quand la photo a été retirée du bucket. Distingue « jamais de photo » de « photo supprimée ».';

-- ---------------------------------------------------------------------------
-- 3. Appel de la fonction Edge
--
-- Copie de `appeler_notifications`, avec sa propre URL et son propre en-tête.
-- `timeout_milliseconds` : la purge peut durer bien plus que les 5 s par
-- défaut de pg_net ; la passerelle laisse 150 s aux fonctions.
-- ---------------------------------------------------------------------------
create or replace function public.appeler_maintenance(charge jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
begin
  select valeur into v_url    from public.configuration where cle = 'url_fonction_maintenance';
  select valeur into v_secret from public.configuration where cle = 'secret_notifications';

  -- Installation incomplète : on trace sans lever d'erreur, comme pour les
  -- notifications. pg_cron consignerait l'échec, mais rien d'autre ne casse.
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    raise warning 'Maintenance non configurée : renseignez url_fonction_maintenance et secret_notifications dans public.configuration.';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-secret-maintenance', v_secret
    ),
    body    := charge,
    timeout_milliseconds := 120000
  );
end;
$$;

comment on function public.appeler_maintenance is
  'Appelle la fonction Edge « maintenance » via pg_net. Ne lève jamais d''erreur bloquante.';

-- ---------------------------------------------------------------------------
-- 4. La purge : lit la durée de conservation et déclenche la fonction
--
-- Une valeur absurde (vide, non numérique, zéro) SUSPEND la purge au lieu de
-- retomber sur six mois : mieux vaut ne rien supprimer que supprimer sur une
-- configuration qu'on n'a pas comprise.
-- ---------------------------------------------------------------------------
create or replace function public.purger_photos_anciennes()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_valeur text;
begin
  select valeur into v_valeur from public.configuration where cle = 'retention_photos_mois';

  if coalesce(v_valeur, '') !~ '^[0-9]{1,3}$' or v_valeur::int < 1 or v_valeur::int > 120 then
    raise warning 'retention_photos_mois invalide (« % ») : la purge des photos est suspendue. Attendu : un entier de 1 à 120.', coalesce(v_valeur, '');
    return;
  end if;

  perform public.appeler_maintenance(
    jsonb_build_object('mode', 'purge_photos', 'mois', v_valeur::int)
  );
end;
$$;

comment on function public.purger_photos_anciennes is
  'Demande à la fonction Edge « maintenance » de supprimer les photos plus anciennes que retention_photos_mois.';

-- Aucun rôle client ne doit pouvoir déclencher ces appels par l'API REST
-- (POST /rest/v1/rpc/…) : pg_cron et les déclencheurs s'exécutent en tant que
-- propriétaire, ils ne sont pas concernés. `appeler_notifications` reçoit la
-- même protection, qui lui manquait.
revoke all on function public.appeler_maintenance(jsonb)     from public, anon, authenticated;
revoke all on function public.purger_photos_anciennes()      from public, anon, authenticated;
revoke all on function public.appeler_notifications(jsonb)   from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Planification : chaque nuit, 03:30 UTC (04:30 ou 05:30 à Paris)
--
-- pg_cron s'exécute en UTC (voir 20260804090800_notifications.sql). Une
-- exécution quotidienne suffit : une photo n'a pas besoin de disparaître à la
-- minute près, et un jour de retard sur 180 est invisible.
-- ---------------------------------------------------------------------------
do $$
begin
  -- `cron.unschedule` échoue si la tâche n'existe pas : on ignore ce cas.
  perform cron.unschedule('purge-photos');
exception
  when others then null;
end
$$;

select cron.schedule(
  'purge-photos',
  '30 3 * * *',
  $$ select public.purger_photos_anciennes() $$
);
