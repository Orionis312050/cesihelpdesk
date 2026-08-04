-- Tables de référence : salles et catégories d'incident.
--
-- Ce sont les deux seules tables lisibles sans authentification : le formulaire
-- public de déclaration, atteint par scan d'un QR code, doit pouvoir les afficher
-- avant toute connexion. Ce choix est délibéré (voir docs/03-base-de-donnees.md).

create table if not exists public.salles (
  id          bigint generated always as identity primary key,
  nom         text        not null unique,
  batiment    text,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.salles is 'Salles du campus pouvant faire l''objet d''un signalement.';
comment on column public.salles.actif is
  'Une salle désaffectée passe à false : elle disparaît du formulaire mais les tickets historiques restent lisibles.';

create table if not exists public.categories_incident (
  id      bigint generated always as identity primary key,
  label   text    not null unique,
  actif   boolean not null default true
);

comment on table public.categories_incident is 'Types d''incident proposés en cases à cocher (choix multiple).';

-- Le formulaire trie les salles par ordre alphabétique à chaque chargement.
create index if not exists idx_salles_nom on public.salles (nom);
create index if not exists idx_categories_incident_label on public.categories_incident (label);
