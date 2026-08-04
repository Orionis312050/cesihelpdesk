-- Politiques de sécurité au niveau ligne (RLS).
--
-- MODÈLE DE MENACE
--
-- La clé publiable (`sb_publishable_…`) est intégrée au JavaScript envoyé au
-- navigateur : n'importe qui peut la lire et interroger l'API directement, sans
-- passer par l'interface. La sécurité de cette application ne repose donc PAS sur
-- ce que l'interface affiche ou masque, mais uniquement sur les règles ci-dessous.
--
-- | Acteur                    | Peut                                                   |
-- |---------------------------|--------------------------------------------------------|
-- | Visiteur anonyme (`anon`) | lire les salles et catégories actives ;                 |
-- |                           | créer un ticket via `creer_ticket()` UNIQUEMENT.        |
-- |                           | Ne peut lire AUCUN ticket, ni aucun nom d'agent.        |
-- | Technicien                | lire tous les tickets ; modifier statut, affectation    |
-- |                           | et commentaire ; lire l'annuaire du personnel.          |
-- | Administrateur            | idem + suppression, gestion des référentiels,           |
-- |                           | gestion des comptes, lecture du journal d'e-mails.      |
-- | `service_role`            | tout (Edge Functions). Cette clé reste côté serveur.    |
--
-- POINT DE VIGILANCE : `salles` et `categories_incident` sont volontairement
-- lisibles sans authentification. Le formulaire public en a besoin pour afficher
-- la liste déroulante des salles et les cases à cocher AVANT toute connexion.
-- Ce n'est pas un oubli : ne les fermez pas sans casser le parcours QR code.

-- ---------------------------------------------------------------------------
-- Retrait des droits par défaut
--
-- Supabase accorde par défaut de larges privilèges à `anon` et `authenticated`
-- sur le schéma public. On repart de zéro et on ne redonne que le nécessaire.
-- ---------------------------------------------------------------------------
revoke all on public.salles              from anon, authenticated;
revoke all on public.categories_incident from anon, authenticated;
revoke all on public.tickets             from anon, authenticated;
revoke all on public.ticket_categories   from anon, authenticated;
revoke all on public.utilisateurs        from anon, authenticated;
revoke all on public.email_log           from anon, authenticated;

-- `service_role` conserve un accès complet : c'est la clé utilisée par les Edge
-- Functions, côté serveur, pour composer les e-mails et journaliser les envois.
-- Elle contourne RLS, mais les privilèges de table restent nécessaires — sans
-- ce GRANT, les fonctions échouent sur « permission denied for table tickets ».
-- Cette clé n'est jamais exposée au navigateur.
grant all on public.salles              to service_role;
grant all on public.categories_incident to service_role;
grant all on public.tickets             to service_role;
grant all on public.ticket_categories   to service_role;
grant all on public.utilisateurs        to service_role;
grant all on public.email_log           to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table public.salles              enable row level security;
alter table public.categories_incident enable row level security;
alter table public.tickets             enable row level security;
alter table public.ticket_categories   enable row level security;
alter table public.utilisateurs        enable row level security;
alter table public.email_log           enable row level security;

-- ---------------------------------------------------------------------------
-- salles
-- ---------------------------------------------------------------------------
grant select on public.salles to anon, authenticated;
grant insert, update, delete on public.salles to authenticated;

-- Deux politiques distinctes plutôt qu'une seule avec `or` : la politique de
-- `anon` ne doit appeler AUCUNE fonction d'aide. Les droits d'exécution sont
-- vérifiés à la planification, pas à l'évaluation : une condition
-- `actif or public.est_personnel()` échouerait pour `anon` avec
-- « permission denied for function est_personnel », même quand `actif` est vrai.
drop policy if exists salles_lecture_publique on public.salles;
drop policy if exists salles_lecture_anonyme on public.salles;
create policy salles_lecture_anonyme on public.salles
  for select to anon
  using (actif);

drop policy if exists salles_lecture_personnel on public.salles;
create policy salles_lecture_personnel on public.salles
  for select to authenticated
  using (actif or public.est_personnel());

drop policy if exists salles_gestion_admin on public.salles;
create policy salles_gestion_admin on public.salles
  for all to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- ---------------------------------------------------------------------------
-- categories_incident
-- ---------------------------------------------------------------------------
grant select on public.categories_incident to anon, authenticated;
grant insert, update, delete on public.categories_incident to authenticated;

drop policy if exists categories_lecture_publique on public.categories_incident;
drop policy if exists categories_lecture_anonyme on public.categories_incident;
create policy categories_lecture_anonyme on public.categories_incident
  for select to anon
  using (actif);

drop policy if exists categories_lecture_personnel on public.categories_incident;
create policy categories_lecture_personnel on public.categories_incident
  for select to authenticated
  using (actif or public.est_personnel());

drop policy if exists categories_gestion_admin on public.categories_incident;
create policy categories_gestion_admin on public.categories_incident
  for all to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- ---------------------------------------------------------------------------
-- tickets
--
-- Aucun droit pour `anon` : la création passe exclusivement par la fonction
-- `creer_ticket()` (security definer), qui n'a pas besoin de ces privilèges.
--
-- Les colonnes modifiables sont restreintes par un GRANT au niveau colonne.
-- RLS ne sait pas limiter les colonnes : sans ce grant, un technicien pourrait
-- réécrire le nom du demandeur ou la date de création via l'API REST.
-- C'est l'équivalent de la liste blanche que faisait l'ancienne route PATCH.
-- ---------------------------------------------------------------------------
grant select on public.tickets to authenticated;
grant update (statut, assigne_a_id, commentaire_admin) on public.tickets to authenticated;
grant delete on public.tickets to authenticated;

drop policy if exists tickets_lecture_personnel on public.tickets;
create policy tickets_lecture_personnel on public.tickets
  for select to authenticated
  using (public.est_personnel());

drop policy if exists tickets_maj_personnel on public.tickets;
create policy tickets_maj_personnel on public.tickets
  for update to authenticated
  using (public.est_personnel())
  with check (public.est_personnel());

drop policy if exists tickets_suppression_admin on public.tickets;
create policy tickets_suppression_admin on public.tickets
  for delete to authenticated
  using (public.est_admin());

-- ---------------------------------------------------------------------------
-- ticket_categories
-- ---------------------------------------------------------------------------
grant select on public.ticket_categories to authenticated;
grant insert, delete on public.ticket_categories to authenticated;

drop policy if exists ticket_categories_lecture_personnel on public.ticket_categories;
create policy ticket_categories_lecture_personnel on public.ticket_categories
  for select to authenticated
  using (public.est_personnel());

drop policy if exists ticket_categories_ecriture_personnel on public.ticket_categories;
create policy ticket_categories_ecriture_personnel on public.ticket_categories
  for all to authenticated
  using (public.est_personnel())
  with check (public.est_personnel());

-- ---------------------------------------------------------------------------
-- utilisateurs
--
-- L'annuaire du personnel n'est JAMAIS lisible par un visiteur anonyme : il
-- contient des noms et des adresses e-mail professionnelles (RGPD).
-- ---------------------------------------------------------------------------
grant select on public.utilisateurs to authenticated;
grant insert, update, delete on public.utilisateurs to authenticated;

drop policy if exists utilisateurs_lecture_personnel on public.utilisateurs;
create policy utilisateurs_lecture_personnel on public.utilisateurs
  for select to authenticated
  using (public.est_personnel());

-- Chacun peut corriger son propre nom affiché ; seul un admin change les rôles.
drop policy if exists utilisateurs_maj_soi_meme on public.utilisateurs;
create policy utilisateurs_maj_soi_meme on public.utilisateurs
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role = public.role_utilisateur());

drop policy if exists utilisateurs_gestion_admin on public.utilisateurs;
create policy utilisateurs_gestion_admin on public.utilisateurs
  for all to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- ---------------------------------------------------------------------------
-- email_log
--
-- Écrit uniquement par les Edge Functions (clé `service_role`, qui contourne RLS).
-- Aucun droit d'écriture n'est accordé au navigateur.
-- ---------------------------------------------------------------------------
grant select on public.email_log to authenticated;

drop policy if exists email_log_lecture_admin on public.email_log;
create policy email_log_lecture_admin on public.email_log
  for select to authenticated
  using (public.est_admin());
