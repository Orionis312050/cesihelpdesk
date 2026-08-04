-- Déclenchement des notifications par e-mail.
--
-- L'alerte « risque d'accident » est déclenchée par la BASE, pas par le
-- navigateur. Si le navigateur appelait la fonction, fermer l'onglet ou perdre
-- le réseau juste après l'envoi du formulaire suffirait à ce que personne ne
-- soit prévenu — exactement le défaut que cette version corrige.

-- ---------------------------------------------------------------------------
-- Configuration
--
-- L'URL de la fonction et le secret partagé doivent être lisibles par le
-- déclencheur. Ils vivent dans cette table, jamais dans le code source.
-- Aucun rôle client (`anon`, `authenticated`) n'y a accès : seules les
-- fonctions `security definer` la lisent.
-- ---------------------------------------------------------------------------
create table if not exists public.configuration (
  cle    text primary key,
  valeur text not null
);

comment on table public.configuration is
  'Paramètres techniques lus par les déclencheurs. Renseignés à l''installation (voir docs/01-installation.md).';

alter table public.configuration enable row level security;
revoke all on public.configuration from anon, authenticated;

-- Table sans aucune politique : volontairement inaccessible depuis l'API REST.
-- Seuls `service_role` (qui contourne RLS) et les fonctions `security definer`
-- peuvent la lire.

insert into public.configuration (cle, valeur) values
  ('url_fonction_notifications', ''),
  ('secret_notifications', '')
on conflict (cle) do nothing;

-- ---------------------------------------------------------------------------
-- Appel de la fonction Edge
-- ---------------------------------------------------------------------------
create or replace function public.appeler_notifications(charge jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
begin
  select valeur into v_url    from public.configuration where cle = 'url_fonction_notifications';
  select valeur into v_secret from public.configuration where cle = 'secret_notifications';

  -- Installation incomplète : on trace sans faire échouer l'opération en cours.
  -- Une déclaration d'incident ne doit JAMAIS échouer parce que l'envoi d'e-mail
  -- n'est pas configuré.
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    raise warning 'Notifications non configurées : renseignez url_fonction_notifications et secret_notifications dans public.configuration.';
    return;
  end if;

  -- `net.http_post` est asynchrone : il met la requête en file d'attente et rend
  -- la main immédiatement. La transaction du ticket n'attend pas le serveur SMTP.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-secret-notifications', v_secret
    ),
    body    := charge
  );
end;
$$;

comment on function public.appeler_notifications is
  'Appelle la fonction Edge « notifications » via pg_net. Ne lève jamais d''erreur bloquante.';

-- ---------------------------------------------------------------------------
-- Alerte immédiate en cas de risque
-- ---------------------------------------------------------------------------
create or replace function public.notifier_incident_urgent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.appeler_notifications(
    jsonb_build_object('mode', 'urgent', 'ticket_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_incident_urgent on public.tickets;
create trigger trg_incident_urgent
  after insert on public.tickets
  for each row
  when (new.risque_accident)
  execute function public.notifier_incident_urgent();

-- ---------------------------------------------------------------------------
-- Récapitulatif hebdomadaire
--
-- pg_cron s'exécute en UTC ; il n'accepte pas de fuseau horaire dans
-- l'expression. `0 6 * * 5` correspond donc à 08 h 00 à Paris en heure d'été et
-- à 07 h 00 en heure d'hiver. Cet écart d'une heure est sans conséquence pour
-- un récapitulatif hebdomadaire ; la procédure de changement d'horaire est
-- décrite dans docs/04-exploitation.md.
-- ---------------------------------------------------------------------------
do $$
begin
  -- `cron.unschedule` échoue si la tâche n'existe pas : on ignore ce cas.
  perform cron.unschedule('recap-hebdomadaire');
exception
  when others then null;
end
$$;

select cron.schedule(
  'recap-hebdomadaire',
  '0 6 * * 5',
  $$ select public.appeler_notifications('{"mode":"recap"}'::jsonb) $$
);
