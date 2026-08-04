-- Comptes du personnel (administrateurs et techniciens).
--
-- L'identité vit dans `auth.users`, géré par Supabase Auth (mot de passe, jeton,
-- réinitialisation). Cette table porte uniquement ce que l'application ajoute :
-- le nom affiché, le rôle et l'état actif.
--
-- Choix : on ne crée PAS de table `profiles` séparée. La table `utilisateurs`
-- existait déjà et servait de référentiel des techniciens ; elle est simplement
-- rattachée à `auth.users`. Deux tables « personnel » signifieraient deux sources
-- de vérité à garder synchronisées.

create table if not exists public.utilisateurs (
  id           uuid        primary key references auth.users (id) on delete cascade,
  nom_complet  text        not null,
  email        text        not null unique,
  role         text        not null default 'technicien' check (role in ('admin', 'technicien')),
  actif        boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.utilisateurs is
  'Personnel habilité à traiter les incidents. Une ligne par compte auth.users.';
comment on column public.utilisateurs.role is
  'admin : accès complet (statistiques, QR codes, gestion). technicien : consultation et traitement des tickets.';
comment on column public.utilisateurs.actif is
  'Départ d''un agent : passer à false plutôt que supprimer, pour conserver l''historique des affectations.';

create index if not exists idx_utilisateurs_actif on public.utilisateurs (actif) where actif;

-- Création automatique de la ligne applicative à l'inscription d'un compte.
--
-- `security definer` est indispensable : le déclencheur s'exécute dans le contexte
-- de l'insertion dans auth.users, qui n'a aucun droit sur le schéma public.
-- `search_path` est figé pour empêcher qu'un schéma malveillant placé en tête du
-- chemin de recherche détourne les appels de fonction.
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.utilisateurs (id, nom_complet, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nom_complet'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'technicien')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.gerer_nouvel_utilisateur();
