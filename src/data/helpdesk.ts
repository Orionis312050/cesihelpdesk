import type { Status } from '../types/helpdesk'

/**
 * Libellé et classes de badge associés à chaque statut de ticket.
 *
 * Source unique de vérité pour l'affichage des statuts : la liste déroulante du
 * tableau de suivi, les badges, l'export Excel et les statistiques lisent tous
 * ici. N'écrivez jamais « En cours » en dur dans un composant.
 */
export const STATUSES: Record<Status, { label: string, color: string }> = {
  NOUVEAU: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  EN_COURS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-purple-100 text-purple-800' },
  TERMINE: { label: 'Terminé', color: 'bg-green-100 text-green-800' }
}

/** Ordre d'affichage des statuts, du plus « ouvert » au plus « fermé ». */
export const STATUS_ORDER: Status[] = ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE', 'TERMINE']
