-- Jeu de données de démonstration.
--
-- Rejoué automatiquement par `supabase db reset`. À adapter aux vraies salles du
-- campus avant mise en service (voir docs/04-exploitation.md § Ajouter une salle).
--
-- IMPORTANT : ce fichier est aussi le prérequis des tests RLS. Vérifier qu'un
-- visiteur anonyme ne voit rien n'a aucune valeur si la table est vide de toute
-- façon — il faut des lignes réelles pour distinguer « refusé » de « vide ».

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

-- ---------------------------------------------------------------------------
-- Tickets de démonstration
--
-- Couvrent les 4 statuts, 2 incidents à risque, plusieurs salles et plusieurs
-- catégories, répartis sur l'année pour que l'histogramme mensuel et le délai
-- moyen de résolution aient quelque chose à afficher.
--
-- Les comptes du personnel ne sont pas créés ici : ils dépendent de auth.users.
-- Voir docs/01-installation.md § Créer le premier compte admin.
-- ---------------------------------------------------------------------------
-- `where not exists (...)` rend le fichier rejouable : relancer le seed sur une
-- base qui contient déjà des tickets ne duplique rien.
insert into public.tickets
  (created_at, demandeur_nom, demandeur_email, salle_id, titre, description, risque_accident, statut, commentaire_admin, resolu_le)
select
  t.created_at, t.demandeur_nom, t.demandeur_email, s.id,
  t.titre, t.description, t.risque_accident, t.statut, t.commentaire_admin, t.resolu_le
from (values
  (now() - interval '340 days', 'Marc Lefèvre',    'marc.lefevre@viacesi.fr',    'B204',                    'Vidéoprojecteur hors service',    'Le vidéoprojecteur ne s''allume plus, la LED reste rouge.',                     false, 'TERMINE'::public.statut_ticket,    'Lampe remplacée.',                               now() - interval '336 days'),
  (now() - interval '281 days', 'Claire Dubois',   'claire.dubois@viacesi.fr',   'A101',                    'Store cassé',                     'Le store de la fenêtre côté cour ne remonte plus.',                             false, 'TERMINE'::public.statut_ticket,    'Mécanisme changé par le prestataire.',           now() - interval '270 days'),
  (now() - interval '212 days', 'Yanis Bouchard',  'yanis.bouchard@viacesi.fr',  'Salle Informatique 1',    'Trois postes ne démarrent plus',  'Postes 4, 7 et 12 : écran noir au démarrage.',                                  false, 'TERMINE'::public.statut_ticket,    'Alimentations remplacées.',                      now() - interval '205 days'),
  (now() - interval '154 days', 'Sophie Marchand', 'sophie.marchand@viacesi.fr', 'Laboratoire Électronique','Prise électrique arrachée',       'La prise murale près du plan de travail pend au bout de ses fils.',             true,  'TERMINE'::public.statut_ticket,    'Circuit consigné puis prise remplacée.',         now() - interval '153 days'),
  (now() - interval '96 days',  'Thomas Girard',   'thomas.girard@viacesi.fr',   'Amphithéâtre Pascal',     'Sonorisation grésillante',        'Le micro HF grésille dès qu''on s''éloigne du pupitre.',                        false, 'TERMINE'::public.statut_ticket,    'Piles et récepteur changés.',                    now() - interval '88 days'),
  (now() - interval '61 days',  'Nadia Benali',    'nadia.benali@viacesi.fr',    'Cafétéria',               'Fuite sous l''évier',             'Flaque d''eau constatée chaque matin sous l''évier de gauche.',                  false, 'TERMINE'::public.statut_ticket,    'Joint de siphon remplacé.',                      now() - interval '55 days'),
  (now() - interval '34 days',  'Julien Perrot',   'julien.perrot@viacesi.fr',   'B102',                    'Chauffage bloqué au maximum',     'Impossible de baisser le radiateur, il fait 27 °C dans la salle.',              false, 'EN_ATTENTE'::public.statut_ticket, 'En attente de la vanne thermostatique.',         null),
  (now() - interval '21 days',  'Émilie Roux',     'emilie.roux@viacesi.fr',     'Atelier Mécanique',       'Garde de protection manquante',   'La garde de la scie à ruban a disparu, la lame est accessible.',                true,  'EN_COURS'::public.statut_ticket,   'Machine consignée, garde commandée.',            null),
  (now() - interval '9 days',   'Hugo Renard',     'hugo.renard@viacesi.fr',     'Salle Informatique 2',    'Wi-Fi inutilisable',              'Le point d''accès décroche toutes les cinq minutes environ.',                   false, 'EN_COURS'::public.statut_ticket,   'Diagnostic en cours avec le service réseau.',    null),
  (now() - interval '4 days',   'Laura Fontaine',  'laura.fontaine@viacesi.fr',  'A202',                    'Néon clignotant',                 'Le néon du fond clignote en permanence, c''est très gênant.',                   false, 'NOUVEAU'::public.statut_ticket,    '',                                               null),
  (now() - interval '2 days',   'Karim Haddad',    'karim.haddad@viacesi.fr',    'Bibliothèque',            'Chaises cassées',                 'Quatre chaises ont le dossier fendu, elles ne sont plus utilisables.',          false, 'NOUVEAU'::public.statut_ticket,    '',                                               null),
  (now() - interval '6 hours',  'Inès Moreau',     'ines.moreau@viacesi.fr',     'Amphithéâtre Curie',      'Porte coupe-feu bloquée ouverte', 'La porte coupe-feu est calée avec un extincteur, elle ne peut plus se fermer.', true,  'NOUVEAU'::public.statut_ticket,    '',                                               null)
) as t (created_at, demandeur_nom, demandeur_email, salle_nom, titre, description, risque_accident, statut, commentaire_admin, resolu_le)
join public.salles s on s.nom = t.salle_nom
where not exists (select 1 from public.tickets);

-- Rattachement des catégories aux tickets de démonstration.
insert into public.ticket_categories (ticket_id, category_id)
select t.id, c.id
from public.tickets t
join lateral (
  values
    ('Vidéoprojecteur hors service',    'Informatique / Vidéoprojecteur'),
    ('Store cassé',                     'Serrurerie / Menuiserie'),
    ('Trois postes ne démarrent plus',  'Informatique / Vidéoprojecteur'),
    ('Prise électrique arrachée',       'Électricité / Éclairage'),
    ('Prise électrique arrachée',       'Sécurité'),
    ('Sonorisation grésillante',        'Informatique / Vidéoprojecteur'),
    ('Fuite sous l''évier',             'Plomberie / Sanitaires'),
    ('Chauffage bloqué au maximum',     'Chauffage / Climatisation'),
    ('Garde de protection manquante',   'Sécurité'),
    ('Wi-Fi inutilisable',              'Réseau / Wi-Fi'),
    ('Néon clignotant',                 'Électricité / Éclairage'),
    ('Chaises cassées',                 'Mobilier'),
    ('Porte coupe-feu bloquée ouverte', 'Sécurité')
) as m (titre, label) on m.titre = t.titre
join public.categories_incident c on c.label = m.label
on conflict do nothing;
