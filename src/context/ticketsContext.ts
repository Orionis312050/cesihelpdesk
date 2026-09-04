import { createContext } from 'react'
import type { Ticket, TicketField } from '../types/helpdesk'

/** Valeur exposée par le contexte des tickets. */
export interface TicketsContextValue {
  /** Tickets chargés, du plus récent au plus ancien */
  tickets: Ticket[]
  /** `true` pendant le chargement initial */
  chargement: boolean
  /** Recharge la liste depuis la base */
  recharger: () => Promise<void>
  /** Modifie un champ d'un ticket et met à jour la liste locale */
  modifier: (id: string, champ: TicketField, valeur: string) => Promise<void>
  /**
   * Supprime définitivement un ticket et le retire de la liste locale.
   *
   * Ouvert à tout le personnel (politique RLS). Le ticket entier est demandé,
   * et non son seul identifiant : le chemin de la photo à retirer du bucket en
   * fait partie, et la liste locale doit pouvoir être rétablie en cas de refus.
   *
   * @throws Relaie l'erreur après avoir affiché la notification, pour que
   *   l'appelant sache qu'il n'y a pas lieu de quitter la fiche.
   */
  supprimer: (ticket: Ticket) => Promise<void>
}

export const TicketsContext = createContext<TicketsContextValue | null>(null)
