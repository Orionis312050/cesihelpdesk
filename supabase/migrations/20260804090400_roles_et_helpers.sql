-- Fonctions d'aide pour les politiques RLS.
--
-- POURQUOI `security definer` :
-- une politique posée sur `utilisateurs` qui interrogerait `utilisateurs` pour
-- connaître le rôle déclencherait une récursion infinie (Postgres renvoie
-- « infinite recursion detected in policy for relation "utilisateurs" »).
-- Une fonction `security definer` s'exécute avec les droits de son propriétaire
-- et contourne donc RLS : la lecture du rôle n'est plus soumise à la politique
-- qu'elle sert à évaluer.
--
-- `set search_path = public, pg_temp` est obligatoire sur toute fonction
-- `security definer` : sans cela, un utilisateur peut placer un schéma de son
-- choix en tête du chemin de recherche et détourner les appels de fonction
-- exécutés avec des droits élevés.

-- Rôle de l'utilisateur connecté, ou NULL s'il n'est pas membre du personnel actif.
create or replace function public.role_utilisateur()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role
  from public.utilisateurs u
  where u.id = (select auth.uid()) and u.actif
$$;

-- L'utilisateur connecté est-il un membre actif du personnel (admin ou technicien) ?
create or replace function public.est_personnel()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.utilisateurs u
    where u.id = (select auth.uid()) and u.actif
  )
$$;

-- L'utilisateur connecté est-il administrateur ?
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.utilisateurs u
    where u.id = (select auth.uid()) and u.actif and u.role = 'admin'
  )
$$;

comment on function public.role_utilisateur is 'Rôle du compte connecté (admin/technicien), NULL si non habilité.';
comment on function public.est_personnel is 'Vrai si le compte connecté est un membre actif du personnel.';
comment on function public.est_admin is 'Vrai si le compte connecté est administrateur actif.';

revoke all on function public.role_utilisateur() from public;
revoke all on function public.est_personnel() from public;
revoke all on function public.est_admin() from public;
grant execute on function public.role_utilisateur() to authenticated;
grant execute on function public.est_personnel() to authenticated;
grant execute on function public.est_admin() to authenticated;
