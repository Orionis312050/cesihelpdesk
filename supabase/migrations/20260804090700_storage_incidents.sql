-- Bucket de stockage des photos d'incident.
--
-- PRIVÉ, volontairement. Une photo prise dans une salle de cours peut montrer
-- des personnes, du matériel ou un plan des locaux. Un bucket public rendrait
-- ces images accessibles à quiconque devine une URL, sans authentification et
-- sans trace. La consultation passe par des URL signées d'une heure, générées
-- pour le personnel connecté.
--
-- Les limites de taille et de type MIME sont posées ICI, côté serveur. La
-- compression faite dans le navigateur est un confort d'usage : elle ne protège
-- de rien, puisqu'un client modifié peut envoyer ce qu'il veut.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incidents',
  'incidents',
  false,
  2097152, -- 2 Mio : une photo compressée pèse ~200 Ko, la marge est large
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt anonyme autorisé : le formulaire public doit pouvoir joindre une photo
-- sans connexion. C'est un droit d'INSERT seul.
drop policy if exists incidents_depot_anonyme on storage.objects;
create policy incidents_depot_anonyme on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'incidents');

-- Lecture réservée au personnel : sans cette restriction, n'importe qui pourrait
-- lister le bucket et récupérer toutes les photos du campus.
drop policy if exists incidents_lecture_personnel on storage.objects;
create policy incidents_lecture_personnel on storage.objects
  for select to authenticated
  using (bucket_id = 'incidents' and public.est_personnel());

-- Ni modification ni suppression depuis le navigateur : une photo jointe à un
-- signalement ne doit pas pouvoir être remplacée après coup. La purge RGPD se
-- fait avec la clé de service (voir docs/04-exploitation.md).
drop policy if exists incidents_suppression_admin on storage.objects;
create policy incidents_suppression_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'incidents' and public.est_admin());
