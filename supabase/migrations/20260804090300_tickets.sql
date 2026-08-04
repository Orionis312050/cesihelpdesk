-- Tickets d'incident et tables associées.

create table if not exists public.tickets (
  id                 bigint               generated always as identity primary key,
  created_at         timestamptz          not null default now(),
  demandeur_nom      text                 not null,
  demandeur_email    text                 not null,
  salle_id           bigint               not null references public.salles (id) on delete restrict,
  titre              text                 not null,
  description        text                 not null default '',
  image_chemin       text,
  risque_accident    boolean              not null default false,
  statut             public.statut_ticket not null default 'NOUVEAU',
  assigne_a_id       uuid                 references public.utilisateurs (id) on delete set null,
  commentaire_admin  text                 not null default '',
  resolu_le          timestamptz,

  constraint tickets_titre_non_vide check (length(trim(titre)) between 1 and 200),
  constraint tickets_nom_non_vide check (length(trim(demandeur_nom)) between 1 and 120),
  constraint tickets_email_valide check (demandeur_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table public.tickets is 'Signalements d''incident déclarés depuis le formulaire public ou l''espace admin.';
comment on column public.tickets.image_chemin is
  'Chemin de l''objet dans le bucket Storage « incidents » (ex : 42/a3f1....jpg). JAMAIS une URL : les URL signées expirent.';
comment on column public.tickets.resolu_le is
  'Renseigné automatiquement au passage en TERMINE. Sert au calcul du délai moyen de résolution.';
comment on column public.tickets.salle_id is
  'on delete restrict : on ne supprime pas une salle qui porte un historique. La désactiver (salles.actif = false).';

create table if not exists public.ticket_categories (
  ticket_id    bigint not null references public.tickets (id) on delete cascade,
  category_id  bigint not null references public.categories_incident (id) on delete cascade,
  primary key (ticket_id, category_id)
);

comment on table public.ticket_categories is 'Association N-N : un incident peut relever de plusieurs types.';

-- Journal des envois d'e-mail.
--
-- Ce n'est PAS une table d'audit générique (choix documenté dans docs/adr/).
-- C'est le strict minimum permettant de répondre à « les e-mails n'arrivent
-- plus » : sans elle, un échec SMTP est totalement invisible.
create table if not exists public.email_log (
  id             bigint      generated always as identity primary key,
  type           text        not null check (type in ('urgent', 'recap')),
  ticket_id      bigint      references public.tickets (id) on delete set null,
  destinataires  text        not null,
  statut         text        not null check (statut in ('envoye', 'echec', 'simule')),
  erreur         text,
  envoye_le      timestamptz not null default now()
);

comment on column public.email_log.statut is
  'simule : transport « console » actif (aucun SMTP configuré). echec : le SMTP a refusé le message.';

-- Index adaptés aux deux écrans admin : le tableau de suivi (tri par date, filtre
-- par statut et par salle) et les statistiques (agrégation par mois et par statut).
create index if not exists idx_tickets_created_at on public.tickets (created_at desc);
create index if not exists idx_tickets_statut on public.tickets (statut);
create index if not exists idx_tickets_salle on public.tickets (salle_id);
create index if not exists idx_tickets_assigne on public.tickets (assigne_a_id);
create index if not exists idx_tickets_risque on public.tickets (risque_accident) where risque_accident;
create index if not exists idx_ticket_categories_category on public.ticket_categories (category_id);
create index if not exists idx_email_log_envoye_le on public.email_log (envoye_le desc);

-- Horodatage automatique de la résolution.
-- Calculé en base plutôt que côté client : le délai de résolution affiché dans les
-- statistiques doit rester juste même si le statut est modifié depuis le SQL editor.
create or replace function public.maj_resolu_le()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'TERMINE' and (old.statut is distinct from 'TERMINE') then
    new.resolu_le := now();
  elsif new.statut <> 'TERMINE' then
    new.resolu_le := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_resolu_le on public.tickets;
create trigger trg_tickets_resolu_le
  before update of statut on public.tickets
  for each row execute function public.maj_resolu_le();
