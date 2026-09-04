/**
 * Service d'accès aux tickets d'incident.
 *
 * Trois chemins d'écriture bien distincts :
 *
 * - **Création** : passe par la fonction `creer_ticket()` en base. Le visiteur
 *   anonyme n'a aucun droit direct sur la table `tickets` ; la fonction insère
 *   le ticket et ses catégories dans une seule transaction et renvoie son
 *   numéro. Voir `supabase/migrations/*_rpc_creer_ticket.sql`.
 * - **Mise à jour** : requête directe, réservée au personnel connecté. Les
 *   colonnes modifiables sont limitées côté base par un GRANT au niveau colonne :
 *   même en forgeant une requête, on ne peut pas réécrire le nom du déclarant.
 * - **Suppression** : requête directe également, mais la politique
 *   `tickets_suppression_admin` la réserve aux administrateurs. Un technicien
 *   ne reçoit pas d'erreur : sa requête ne supprime simplement aucune ligne.
 */

import { supabase } from '../lib/supabase'
import type { Status, Ticket, TicketField, TicketInput } from '../types/helpdesk'
import { storageService } from './storage'

/** Ligne renvoyée par la vue enrichie (jointures salle, technicien, catégories). */
type TicketRow = {
  id: number
  created_at: string
  demandeur_nom: string
  demandeur_email: string
  titre: string
  description: string
  image_chemin: string | null
  risque_accident: boolean
  statut: Status
  commentaire_admin: string | null
  resolu_le: string | null
  image_supprimee_le: string | null
  assigne_a_id: string | null
  salles: { nom: string } | null
  utilisateurs: { nom_complet: string } | null
  ticket_categories: { categories_incident: { label: string } | null }[]
}

/**
 * Sélection commune à toutes les lectures de tickets.
 *
 * Les jointures sont résolues par PostgREST en une seule requête, là où
 * l'implémentation précédente chargeait cinq tables entières puis les
 * recomposait en mémoire dans le navigateur.
 */
const SELECTION = `
  id, created_at, demandeur_nom, demandeur_email, titre, description,
  image_chemin, image_supprimee_le, risque_accident, statut, commentaire_admin, resolu_le, assigne_a_id,
  salles ( nom ),
  utilisateurs ( nom_complet ),
  ticket_categories ( categories_incident ( label ) )
`

/** Convertit une ligne de base en objet métier. */
const mapTicket = (row: TicketRow): Ticket => ({
  id: String(row.id),
  createdAt: row.created_at,
  name: row.demandeur_nom,
  email: row.demandeur_email,
  room: row.salles?.nom ?? '',
  types: row.ticket_categories
    .map(lien => lien.categories_incident?.label)
    .filter((label): label is string => Boolean(label))
    .sort((a, b) => a.localeCompare(b, 'fr')),
  title: row.titre,
  comment: row.description,
  risk: row.risque_accident,
  photoPath: row.image_chemin,
  status: row.statut,
  handler: row.utilisateurs?.nom_complet ?? '',
  handlerId: row.assigne_a_id,
  adminComment: row.commentaire_admin ?? '',
  resolvedAt: row.resolu_le,
  photoDeletedAt: row.image_supprimee_le,
})

/** Colonne de base correspondant à chaque champ modifiable. */
const COLONNE_PAR_CHAMP: Record<TicketField, string> = {
  status: 'statut',
  handler: 'assigne_a_id',
  adminComment: 'commentaire_admin',
}

export const ticketService = {
  /**
   * Charge tous les tickets visibles, du plus récent au plus ancien.
   *
   * Un visiteur non connecté reçoit une liste vide : les politiques RLS ne lui
   * accordent aucun accès à la table.
   *
   * @returns Liste des tickets.
   * @throws {Error} Si la requête échoue.
   */
  async list(): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select(SELECTION)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Impossible de charger les incidents : ${error.message}`)
    return (data as unknown as TicketRow[]).map(mapTicket)
  },

  /**
   * Charge un ticket par son identifiant.
   *
   * @param id Identifiant du ticket.
   * @returns Le ticket, ou `null` s'il n'existe pas ou n'est pas accessible.
   * @throws {Error} Si la requête échoue.
   */
  async getById(id: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select(SELECTION)
      .eq('id', Number(id))
      .maybeSingle()

    if (error) throw new Error(`Impossible de charger l'incident : ${error.message}`)
    return data ? mapTicket(data as unknown as TicketRow) : null
  },

  /**
   * Déclare un nouvel incident.
   *
   * @param form Données du formulaire.
   * @returns Le numéro de la demande créée, à afficher au déclarant.
   * @throws {Error} Si la salle ou un type d'incident est inconnu, ou si un
   *   champ obligatoire manque. Les messages proviennent de la base et sont
   *   déjà rédigés en français.
   *
   * @example
   * const numero = await ticketService.create({ name: 'Alex', ... })
   * // '42'
   */
  async create(form: TicketInput): Promise<string> {
    const { data, error } = await supabase.rpc('creer_ticket', {
      payload: {
        nom: form.name,
        email: form.email,
        salle: form.room,
        titre: form.title,
        description: form.comment,
        risque: form.risk,
        image_chemin: form.photoPath,
        types: form.types,
      },
    })

    if (error) throw new Error(error.message || "Impossible d'enregistrer la demande.")
    return String(data)
  },

  /**
   * Met à jour un champ modifiable d'un ticket.
   *
   * @param id Identifiant du ticket.
   * @param field Champ à modifier.
   * @param value Nouvelle valeur. Pour `handler`, l'identifiant du technicien
   *   ou une chaîne vide pour désassigner.
   * @throws {Error} Si la mise à jour est refusée.
   */
  async update(id: string, field: TicketField, value: string): Promise<void> {
    const colonne = COLONNE_PAR_CHAMP[field]
    const valeur = field === 'handler' ? (value || null) : value

    const { error } = await supabase
      .from('tickets')
      .update({ [colonne]: valeur })
      .eq('id', Number(id))

    if (error) throw new Error(`Impossible de mettre à jour l'incident : ${error.message}`)
  },

  /**
   * Supprime définitivement un incident, ainsi que la photo qui lui est jointe.
   *
   * Réservé aux administrateurs par la politique `tickets_suppression_admin`.
   * Les types d'incident associés partent avec la ligne (`on delete cascade`) ;
   * le journal d'e-mails garde ses lignes, leur `ticket_id` passant à `null`.
   *
   * ORDRE DES OPÉRATIONS : la ligne d'abord, la photo ensuite. L'inverse
   * détruirait la photo d'un incident encore présent si la base refusait la
   * suppression. Si Storage échoue une fois la ligne partie, il ne reste qu'un
   * fichier orphelin, et l'appelant en est averti.
   *
   * @param id Identifiant du ticket.
   * @param cheminPhoto Valeur de `photoPath`, `null` en l'absence de photo.
   * @returns `photoSupprimee` à `false` si la photo est restée dans le bucket.
   * @throws {Error} Si la base refuse la suppression — le cas d'un technicien.
   */
  async supprimer(id: string, cheminPhoto: string | null): Promise<{ photoSupprimee: boolean }> {
    // `select()` force PostgREST à renvoyer les lignes supprimées : sans lui,
    // une suppression bloquée par RLS répond « succès » sur zéro ligne, et
    // l'interface annoncerait une suppression qui n'a pas eu lieu.
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', Number(id))
      .select('id')

    if (error) throw new Error(`Impossible de supprimer l'incident : ${error.message}`)
    if (!data?.length) {
      throw new Error("Suppression refusée : seul un administrateur peut supprimer un incident.")
    }

    return { photoSupprimee: cheminPhoto ? await storageService.supprimerPhoto(cheminPhoto) : true }
  },
}
