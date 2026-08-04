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
}

export const TicketsContext = createContext<TicketsContextValue | null>(null)
