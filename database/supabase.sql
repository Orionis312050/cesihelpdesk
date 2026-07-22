create table if not exists public.tickets (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  room text not null,
  types jsonb not null default '[]'::jsonb,
  title text not null,
  comment text not null,
  risk boolean not null default false,
  photo text,
  status text not null default 'NOUVEAU' check (status in ('NOUVEAU', 'EN_COURS', 'EN_ATTENTE', 'TERMINE')),
  handler text not null default '',
  admin_comment text not null default ''
);

alter table public.tickets enable row level security;
create policy "development tickets access" on public.tickets for all to anon using (true) with check (true);
