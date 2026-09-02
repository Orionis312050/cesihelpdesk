-- Référentiels de production : salles et catégories d'incident.
--
-- Extrait de supabase/seed.sql SANS les tickets de démonstration. À charger sur
-- l'instance autohébergée (deploy/scripts/appliquer-migrations.sh) ; pour la
-- recette, préférez `--demo`, qui charge seed.sql en entier — les tests RLS ont
-- besoin de vraies lignes pour distinguer « refusé » de « vide ».
--
-- Rejouable : `on conflict do nothing`. Adaptez la liste aux salles du campus
-- avant d'imprimer les affiches (docs/04-exploitation.md § Ajouter une salle).

-- ---------------------------------------------------------------------------
-- Salles
-- ---------------------------------------------------------------------------
insert into public.salles (nom, batiment) values
  ('A101', 'Bâtiment A'),
  ('A102', 'Bâtiment A'),
  ('A103', 'Bâtiment A'),
  ('A201', 'Bâtiment A'),
  ('A202', 'Bâtiment A'),
  ('A203', 'Bâtiment A'),
  ('Amphithéâtre Curie', 'Bâtiment A'),
  ('B101', 'Bâtiment B'),
  ('B102', 'Bâtiment B'),
  ('B201', 'Bâtiment B'),
  ('B202', 'Bâtiment B'),
  ('B204', 'Bâtiment B'),
  ('Amphithéâtre Pascal', 'Bâtiment B'),
  ('Atelier Mécanique', 'Bâtiment C'),
  ('Atelier Prototypage', 'Bâtiment C'),
  ('Bibliothèque', 'Bâtiment C'),
  ('Cafétéria', 'Bâtiment C'),
  ('Laboratoire Électronique', 'Bâtiment C'),
  ('Salle Informatique 1', 'Bâtiment B'),
  ('Salle Informatique 2', 'Bâtiment B'),
  ('Salle de réunion Vinci', 'Bâtiment A'),
  ('Salle de sport', 'Bâtiment D')
on conflict (nom) do nothing;

-- ---------------------------------------------------------------------------
-- Catégories d'incident
-- ---------------------------------------------------------------------------
insert into public.categories_incident (label) values
  ('Autre'),
  ('Chauffage / Climatisation'),
  ('Électricité / Éclairage'),
  ('Informatique / Vidéoprojecteur'),
  ('Mobilier'),
  ('Plomberie / Sanitaires'),
  ('Propreté'),
  ('Réseau / Wi-Fi'),
  ('Sécurité'),
  ('Serrurerie / Menuiserie')
on conflict (label) do nothing;

