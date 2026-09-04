-- Suppression d'un incident : droit étendu à tout le personnel.
--
-- Jusqu'ici, `tickets_suppression_admin` réservait le DELETE aux administrateurs,
-- et le bucket des photos suivait la même règle. Or ce sont les techniciens qui
-- voient passer les doublons et les déclarations de test : leur demander un
-- administrateur pour retirer une ligne manifestement inutile n'ajoutait aucune
-- protection réelle, seulement un détour.
--
-- CE QUE CELA COÛTE, EN TOUTES LETTRES : un technicien peut désormais effacer
-- définitivement un incident et sa photo. Il n'existe ni corbeille ni journal des
-- suppressions (ADR-009 : pas de table d'audit) ; la seule reprise possible est
-- une restauration de sauvegarde, qui ramène toute la base à sa date. C'est
-- pourquoi l'interface demande une confirmation nommant l'incident visé.
--
-- CE QUI NE CHANGE PAS : un technicien ne peut toujours pas réécrire le nom du
-- déclarant ni la date de déclaration (privilège au niveau colonne), gérer les
-- référentiels, gérer les comptes, ni lire le journal d'e-mails.

-- ---------------------------------------------------------------------------
-- tickets
--
-- Une seule politique remplace l'ancienne plutôt que de s'y ajouter :
-- `est_personnel()` couvre déjà les administrateurs, et deux politiques
-- permissives sur la même opération se liraient comme une exception oubliée.
-- Le `grant delete on public.tickets to authenticated` reste celui de la
-- migration d'origine : c'est RLS, et non le privilège, qui décide ici.
-- ---------------------------------------------------------------------------
drop policy if exists tickets_suppression_admin on public.tickets;
drop policy if exists tickets_suppression_personnel on public.tickets;
create policy tickets_suppression_personnel on public.tickets
  for delete to authenticated
  using (public.est_personnel());

-- ---------------------------------------------------------------------------
-- storage.objects : la photo doit pouvoir partir avec la fiche
--
-- Sans cette extension, un technicien supprimerait l'incident mais pas son
-- image : le fichier resterait sur le disque, rattaché à plus rien, et la purge
-- nocturne ne le verrait jamais — elle part de `tickets.image_chemin`, qui
-- n'existerait plus.
--
-- Le droit porte sur tout le bucket, comme il le faisait pour les
-- administrateurs : RLS ne sait pas vérifier qu'un objet appartient bien à
-- l'incident qu'on est en train de supprimer. Le UPDATE reste interdit à tous :
-- une photo jointe à un signalement ne doit pas pouvoir être remplacée.
-- ---------------------------------------------------------------------------
drop policy if exists incidents_suppression_admin on storage.objects;
drop policy if exists incidents_suppression_personnel on storage.objects;
create policy incidents_suppression_personnel on storage.objects
  for delete to authenticated
  using (bucket_id = 'incidents' and public.est_personnel());
