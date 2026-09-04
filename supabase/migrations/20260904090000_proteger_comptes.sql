-- Garde-fous sur la table des comptes, préalable à l'écran d'administration.
--
-- Jusqu'ici, changer un rôle ou désactiver un agent se faisait en SQL
-- (docs/04-exploitation.md). L'opération passe désormais par la page
-- « Utilisateurs », donc par l'API REST, donc à portée de n'importe qui
-- possédant un jeton d'administrateur. Deux protections deviennent nécessaires.

-- ---------------------------------------------------------------------------
-- 1. Restreindre les colonnes modifiables
--
-- RLS ne sait pas limiter les colonnes : c'est un GRANT au niveau colonne qui
-- s'en charge, comme pour `tickets` (voir 20260804090600_rls_politiques.sql).
--
-- `email` est le reflet de `auth.users.email`. Le réécrire ici désynchroniserait
-- l'annuaire de l'identité de connexion : la personne continuerait à se
-- connecter avec l'ancienne adresse, tandis que l'application afficherait la
-- nouvelle. Changer une adresse de connexion relève de Supabase Auth.
--
-- `insert` est inutile : la ligne est créée par le déclencheur
-- `on_auth_user_created`, et une ligne sans compte `auth.users` correspondant
-- violerait de toute façon la clé étrangère.
--
-- `delete` est nuisible : `tickets.assigne_a_id` est en `on delete set null`,
-- l'historique des affectations serait vidé en silence — et la ligne
-- `auth.users` survivrait, laissant un compte capable de se connecter sans
-- profil. La règle du projet est la désactivation, jamais la suppression.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.utilisateurs from authenticated;
grant update (nom_complet, role, actif) on public.utilisateurs to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Protéger le dernier administrateur actif
--
-- Sans ce déclencheur, un seul clic — se rétrograder ou se désactiver — suffit à
-- laisser l'instance sans personne pour l'administrer. Il ne resterait qu'un
-- accès `psql` sur la VM pour s'en sortir, c'est-à-dire exactement la situation
-- que cet écran supprime.
--
-- L'interface verrouille déjà les actions sur sa propre ligne, mais ce n'est
-- qu'un confort : la clé publiable permet d'appeler l'API REST directement.
-- La règle vit donc en base, comme toutes les autres.
--
-- `security definer` : le contrôle doit voir TOUS les comptes, y compris si les
-- politiques de lecture venaient à se resserrer. `search_path` figé, sans quoi
-- un schéma placé en tête du chemin de recherche détournerait les appels.
-- ---------------------------------------------------------------------------
create or replace function public.proteger_dernier_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Le compte n'était pas un administrateur actif : rien à protéger.
  if not (old.role = 'admin' and old.actif) then
    return new;
  end if;

  -- Il le reste : la modification ne retire aucun administrateur.
  if new.role = 'admin' and new.actif then
    return new;
  end if;

  if not exists (
    select 1 from public.utilisateurs
    where role = 'admin' and actif and id <> old.id
  ) then
    raise exception 'Ce compte est le dernier administrateur actif : nommez un autre administrateur avant de le rétrograder ou de le désactiver.';
  end if;

  return new;
end;
$$;

comment on function public.proteger_dernier_admin is
  'Refuse de retirer le dernier administrateur actif (rétrogradation ou désactivation).';

drop trigger if exists trg_proteger_dernier_admin on public.utilisateurs;
create trigger trg_proteger_dernier_admin
  before update on public.utilisateurs
  for each row execute function public.proteger_dernier_admin();
