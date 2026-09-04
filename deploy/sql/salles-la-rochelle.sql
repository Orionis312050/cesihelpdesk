-- Remplace le référentiel des salles par celui du campus de La Rochelle.
--
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < deploy/sql/salles-la-rochelle.sql
-- (ou copier-coller dans l'éditeur SQL de Supabase Studio, connecté en postgres :
--  la RLS de public.salles n'y fait pas obstacle).
--
-- DESTRUCTIF, ET VOULU TEL QUEL : toute salle absente de la liste ci-dessous est
-- supprimée, AVEC les incidents qu'elle porte. C'est ce qu'il faut pour effacer le
-- référentiel de test (A101, Cafétéria…) et ses signalements d'essai avant la mise
-- en service — mais sur une base déjà exploitée, cela effacerait de vrais tickets.
-- Jouez d'abord l'état des lieux (docs/04-exploitation.md § Remplacer tout le
-- référentiel des salles), ou au minimum :
--   select s.nom, s.actif, count(t.id) as incidents
--     from public.salles s left join public.tickets t on t.salle_id = s.id
--    group by s.id order by s.nom;
--
-- Ce que la suppression d'un incident entraîne :
--   * ticket_categories        -> suit en cascade ;
--   * email_log.ticket_id      -> passe à null, la trace de l'envoi reste ;
--   * photo du bucket Storage  -> N'EST PAS supprimée par le SQL. Le script liste
--     les chemins concernés avant d'effacer : retirez-les depuis Studio →
--     Storage → incidents (procédure de docs/04-exploitation.md § Purger les photos).
--
-- Rejouable, et tout tient dans une transaction : à la moindre erreur, rien n'est
-- écrit. Une salle déjà présente sous le même nom garde son id — ses QR codes déjà
-- imprimés restent valides — et ses incidents avec elle.
--
-- La table n'a qu'une colonne de localisation (`batiment`, texte libre affiché et
-- recherché dans la page Salles) : l'étage y est porté, pas le sous-groupe
-- « services » / « administration ». Ajustez les valeurs si vous préférez l'inverse.

begin;

-- ---------------------------------------------------------------------------
-- La liste cible, écrite une seule fois et réutilisée par les étapes suivantes
-- ---------------------------------------------------------------------------
create temporary table salles_cibles (
  nom      text primary key,
  batiment text
) on commit drop;

insert into salles_cibles (nom, batiment) values
  -- Rez-de-chaussée — salles de cours et espaces de travail
  ('Amphithéâtre',         'Rez-de-chaussée'),
  ('Fablab',               'Rez-de-chaussée'),
  ('Numérilab',            'Rez-de-chaussée'),
  ('Réunion Lab 1',        'Rez-de-chaussée'),
  ('Salle 10',             'Rez-de-chaussée'),
  ('Tour St. Nicolas',     'Rez-de-chaussée'),
  ('Aix',                  'Rez-de-chaussée'),
  ('Madame',               'Rez-de-chaussée'),
  ('Ré',                   'Rez-de-chaussée'),
  ('Oléron',               'Rez-de-chaussée'),
  -- Salles extérieures
  ('Belem',                'Bâtiment annexe'),
  ('Hermione',             'Bâtiment annexe'),
  ('Shtandart',            'Bâtiment annexe'),
  ('Nao',                  'Bâtiment annexe'),
  ('Victoria',             'Bâtiment annexe'),
  -- Rez-de-chaussée — autres espaces et services
  ('Fort Enet',            'Rez-de-chaussée'),
  ('Fort Boyard',          'Rez-de-chaussée'),
  ('Espace Pause',         'Rez-de-chaussée'),
  ('BDE',                  'Rez-de-chaussée'),
  ('Infirmerie',           'Rez-de-chaussée'),
  -- 1er étage — salles de cours et de réunion
  ('Minimes 1',            '1er étage'),
  ('Minimes 2',            '1er étage'),
  ('Concurrence 1',        '1er étage'),
  ('Concurrence 2',        '1er étage'),
  ('Chef de Baie',         '1er étage'),
  ('Rivedoux',             '1er étage'),
  -- 1er étage — bureaux administratifs et services
  ('Scolarité',            '1er étage'),
  ('Pédagogie / Direction', '1er étage');

-- ---------------------------------------------------------------------------
-- Trace avant destruction : ce que les deux DELETE vont emporter.
-- Gardez cette sortie, c'est le seul inventaire de ce qui a disparu.
-- ---------------------------------------------------------------------------
select s.nom          as salle_supprimee,
       s.batiment,
       count(t.id)              as incidents_supprimes,
       count(t.image_chemin)    as photos_a_retirer_du_bucket
  from public.salles s
  left join public.tickets t on t.salle_id = s.id
 where s.nom not in (select nom from salles_cibles)
 group by s.id, s.nom, s.batiment
 order by s.nom;

-- Chemins à supprimer à la main dans Storage → incidents (le SQL n'y touche pas).
select t.image_chemin as photo_orpheline_apres_ce_script
  from public.tickets t
  join public.salles s on s.id = t.salle_id
 where s.nom not in (select nom from salles_cibles)
   and t.image_chemin is not null
 order by t.image_chemin;

-- ---------------------------------------------------------------------------
-- 1. Les nouvelles salles : créées, ou remises à jour et réactivées si le nom existait
-- ---------------------------------------------------------------------------
insert into public.salles (nom, batiment, actif)
select nom, batiment, true from salles_cibles
on conflict (nom) do update
  set batiment = excluded.batiment,
      actif    = true;

-- ---------------------------------------------------------------------------
-- 2. Les incidents de test portés par les anciennes salles.
--    Sans ce DELETE, le suivant échouerait : tickets.salle_id est en
--    `on delete restrict` (migration 20260804090300).
-- ---------------------------------------------------------------------------
delete from public.tickets t
 using public.salles s
 where s.id = t.salle_id
   and s.nom not in (select nom from salles_cibles);

-- ---------------------------------------------------------------------------
-- 3. Les anciennes salles elles-mêmes
-- ---------------------------------------------------------------------------
delete from public.salles s
 where s.nom not in (select nom from salles_cibles);

commit;

-- ---------------------------------------------------------------------------
-- Contrôle : 28 salles, toutes actives, et aucun ticket orphelin
-- ---------------------------------------------------------------------------
select count(*)                            as salles,
       count(*) filter (where actif)       as actives,
       (select count(*) from public.tickets) as incidents_restants
  from public.salles;

select nom, batiment from public.salles order by batiment, nom;
