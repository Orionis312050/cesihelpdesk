-- Référentiels de production : salles et catégories d'incident.
--
-- Extrait de supabase/seed.sql SANS les tickets de démonstration. À charger sur
-- l'instance autohébergée (deploy/scripts/appliquer-migrations.sh) ; pour la
-- recette, préférez `--demo`, qui charge seed.sql en entier — les tests RLS ont
-- besoin de vraies lignes pour distinguer « refusé » de « vide ».
--
-- Rejouable : `on conflict do nothing`. Une salle qui manque s'ajoute ensuite
-- depuis la page Salles de l'application (docs/04-exploitation.md § Ajouter une salle).

-- ---------------------------------------------------------------------------
-- Salles
-- ---------------------------------------------------------------------------
-- Salles réelles du campus de La Rochelle. Pour remplacer un référentiel déjà
-- chargé (les salles fictives d'une installation antérieure, par exemple), jouez
-- deploy/sql/salles-la-rochelle.sql : il fait en plus le ménage de l'ancienne liste.
insert into public.salles (nom, batiment) values
  -- Rez-de-chaussée — salles de cours et espaces de travail
  ('Amphithéâtre', 'Rez-de-chaussée'),
  ('Fablab', 'Rez-de-chaussée'),
  ('Numérilab', 'Rez-de-chaussée'),
  ('Réunion Lab 1', 'Rez-de-chaussée'),
  ('Salle 10', 'Rez-de-chaussée'),
  ('Tour St. Nicolas', 'Rez-de-chaussée'),
  ('Aix', 'Rez-de-chaussée'),
  ('Madame', 'Rez-de-chaussée'),
  ('Ré', 'Rez-de-chaussée'),
  ('Oléron', 'Rez-de-chaussée'),
  -- Salles extérieures
  ('Belem', 'Bâtiment annexe'),
  ('Hermione', 'Bâtiment annexe'),
  ('Shtandart', 'Bâtiment annexe'),
  ('Nao', 'Bâtiment annexe'),
  ('Victoria', 'Bâtiment annexe'),
  -- Rez-de-chaussée — autres espaces et services
  ('Fort Enet', 'Rez-de-chaussée'),
  ('Fort Boyard', 'Rez-de-chaussée'),
  ('Espace Pause', 'Rez-de-chaussée'),
  ('BDE', 'Rez-de-chaussée'),
  ('Infirmerie', 'Rez-de-chaussée'),
  -- 1er étage — salles de cours et de réunion
  ('Minimes 1', '1er étage'),
  ('Minimes 2', '1er étage'),
  ('Concurrence 1', '1er étage'),
  ('Concurrence 2', '1er étage'),
  ('Chef de Baie', '1er étage'),
  ('Rivedoux', '1er étage'),
  -- 1er étage — bureaux administratifs et services
  ('Scolarité', '1er étage'),
  ('Pédagogie / Direction', '1er étage')
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

