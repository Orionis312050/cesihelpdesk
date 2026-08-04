import { useContext } from 'react'
import { TicketsContext, type TicketsContextValue } from '../context/ticketsContext'

/**
 * Accède à la liste partagée des tickets.
 *
 * @returns Tickets, état de chargement et actions de modification.
 * @throws {Error} Si appelé en dehors de `<TicketsProvider>`.
 */
export const useTickets = (): TicketsContextValue => {
  const contexte = useContext(TicketsContext)
  if (!contexte) throw new Error('useTickets doit être utilisé dans un <TicketsProvider>.')
  return contexte
}
