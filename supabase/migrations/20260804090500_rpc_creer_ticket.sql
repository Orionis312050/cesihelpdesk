-- Création d'un ticket par un visiteur anonyme.
--
-- POURQUOI UNE FONCTION PLUTÔT QU'UN INSERT DIRECT :
--
-- 1. Le formulaire public est atteint par scan d'un QR code, sans connexion. Il
--    doit pouvoir créer un ticket. Mais donner à `anon` un droit d'INSERT sur
--    `tickets` oblige aussi à lui donner un droit de SELECT (`insert ... returning`
--    en a besoin), ce qui exposerait tous les signalements du campus.
--    Avec cette fonction, `anon` n'a AUCUN droit sur `tickets`.
--
-- 2. L'ancienne implémentation insérait le ticket, puis ses catégories dans une
--    seconde requête : une coupure réseau entre les deux laissait un ticket sans
--    type d'incident. Ici tout se fait dans une seule transaction.
--
-- 3. La validation (salle connue, catégories connues, longueurs, format d'e-mail)
--    est faite côté serveur. Le navigateur ne décide plus de ce qui est valide.
--
-- La fonction renvoie l'identifiant du ticket créé, ce qui permet enfin d'afficher
-- « Votre demande n° 42 » au déclarant.

create or replace function public.creer_ticket(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nom          text;
  v_email        text;
  v_salle        text;
  v_titre        text;
  v_description  text;
  v_risque       boolean;
  v_image        text;
  v_types        text[];
  v_salle_id     bigint;
  v_ticket_id    bigint;
  v_types_connus int;
begin
  v_nom         := trim(coalesce(payload ->> 'nom', ''));
  v_email       := lower(trim(coalesce(payload ->> 'email', '')));
  v_salle       := trim(coalesce(payload ->> 'salle', ''));
  v_titre       := trim(coalesce(payload ->> 'titre', ''));
  v_description := trim(coalesce(payload ->> 'description', ''));
  v_risque      := coalesce((payload ->> 'risque')::boolean, false);
  v_image       := nullif(trim(coalesce(payload ->> 'image_chemin', '')), '');

  select coalesce(array_agg(valeur), array[]::text[])
    into v_types
    from jsonb_array_elements_text(coalesce(payload -> 'types', '[]'::jsonb)) as valeur;

  -- Validation des champs obligatoires.
  if v_nom = '' or v_email = '' or v_salle = '' or v_titre = '' then
    raise exception 'Champs obligatoires manquants (nom, email, salle, titre).'
      using errcode = 'check_violation';
  end if;

  if length(v_nom) > 120 or length(v_titre) > 200 or length(v_description) > 5000 then
    raise exception 'Un des champs dépasse la longueur autorisée.'
      using errcode = 'check_violation';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide.'
      using errcode = 'check_violation';
  end if;

  -- Le chemin d'image doit désigner un objet du bucket, jamais une URL externe.
  if v_image is not null and v_image !~ '^[0-9a-zA-Z._/-]{1,200}$' then
    raise exception 'Chemin d''image invalide.'
      using errcode = 'check_violation';
  end if;

  -- La salle doit exister et être active.
  select s.id into v_salle_id
    from public.salles s
   where s.nom = v_salle and s.actif
   limit 1;

  if v_salle_id is null then
    raise exception 'La salle « % » n''existe pas.', v_salle
      using errcode = 'foreign_key_violation';
  end if;

  -- Toutes les catégories transmises doivent exister.
  if array_length(v_types, 1) is not null then
    select count(distinct c.id) into v_types_connus
      from public.categories_incident c
     where c.label = any (v_types) and c.actif;

    if v_types_connus <> (select count(distinct t) from unnest(v_types) as t) then
      raise exception 'Un ou plusieurs types d''incident sont inconnus.'
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  insert into public.tickets
    (demandeur_nom, demandeur_email, salle_id, titre, description, image_chemin, risque_accident, statut)
  values
    (v_nom, v_email, v_salle_id, v_titre, v_description, v_image, v_risque, 'NOUVEAU')
  returning id into v_ticket_id;

  insert into public.ticket_categories (ticket_id, category_id)
  select v_ticket_id, c.id
    from public.categories_incident c
   where c.label = any (v_types) and c.actif
  on conflict do nothing;

  return v_ticket_id;
end;
$$;

comment on function public.creer_ticket is
  'Crée un ticket et ses catégories en une transaction. Seul point d''écriture ouvert aux visiteurs anonymes.';

revoke all on function public.creer_ticket(jsonb) from public;
grant execute on function public.creer_ticket(jsonb) to anon, authenticated;
