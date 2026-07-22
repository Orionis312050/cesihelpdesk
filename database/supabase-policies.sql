-- Politiques de développement pour la clé publique utilisée par Vite.
-- À exécuter dans le SQL Editor du projet Supabase.
alter table public.tickets enable row level security;
alter table public.salles enable row level security;
alter table public.categories_incident enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.utilisateurs enable row level security;

create policy "public development access" on public.tickets for all to anon using (true) with check (true);
create policy "public development access" on public.ticket_categories for all to anon using (true) with check (true);
create policy "public development read" on public.salles for select to anon using (true);
create policy "public development read" on public.categories_incident for select to anon using (true);
create policy "public development read" on public.utilisateurs for select to anon using (true);
