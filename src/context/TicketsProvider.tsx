import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ticketService } from '../services/tickets'
import { utilisateurService } from '../services/utilisateurs'
import type { Ticket, TicketField } from '../types/helpdesk'
import { TicketsContext, type TicketsContextValue } from './ticketsContext'

interface TicketsProviderProps {
  children: ReactNode
}

/** Liste vide partagée : évite de recréer un tableau à chaque rendu. */
const AUCUN_TICKET: Ticket[] = []

/**
 * Charge et partage la liste des tickets entre les écrans d'administration.
 *
 * Le chargement n'est déclenché qu'une fois le profil connu : sans session, les
 * politiques RLS ne renvoient rien et la requête serait inutile.
 */
export const TicketsProvider = ({ children }: TicketsProviderProps) => {
  const { profil, chargement: chargementAuth } = useAuth()
  const toast = useToast()
  const [charges, setCharges] = useState<Ticket[]>(AUCUN_TICKET)
  const [chargementListe, setChargementListe] = useState(true)

  // Sans session, la liste vide se déduit du profil au lieu d'être stockée puis
  // remise à zéro : un état de moins à maintenir cohérent.
  const tickets = profil ? charges : AUCUN_TICKET
  const chargement = chargementAuth || (profil ? chargementListe : false)

  useEffect(() => {
    if (chargementAuth || !profil) return

    let monte = true
    ticketService.list()
      .then(liste => { if (monte) setCharges(liste) })
      .catch((cause: unknown) => { if (monte) toast.erreurDe(cause, 'Impossible de charger les incidents.') })
      .finally(() => { if (monte) setChargementListe(false) })

    // Annule la prise en compte du résultat si l'écran est quitté entre-temps.
    return () => { monte = false }
  }, [chargementAuth, profil, toast])

  /** Recharge la liste à la demande (après création d'un incident notamment). */
  const recharger = useCallback(async () => {
    if (!profil) return
    try {
      setCharges(await ticketService.list())
    } catch (cause) {
      toast.erreurDe(cause, 'Impossible de charger les incidents.')
    }
  }, [profil, toast])

  const modifier = useCallback(async (id: string, champ: TicketField, valeur: string) => {
    // Sauvegarde pour restauration : sans elle, un refus de la base laisserait
    // l'écran afficher une valeur qui n'a jamais été enregistrée.
    const precedent = charges

    // Le traitant est choisi par identifiant mais affiché par son nom : on
    // résout le libellé avant la mise à jour optimiste.
    let affichage = ''
    if (champ === 'handler' && valeur) {
      const equipe = await utilisateurService.listActifs().catch(() => [])
      affichage = equipe.find(membre => membre.id === valeur)?.nomComplet ?? ''
    }

    setCharges(current => current.map(ticket => {
      if (ticket.id !== id) return ticket
      if (champ === 'handler') return { ...ticket, handlerId: valeur || null, handler: affichage }
      if (champ === 'status') return { ...ticket, status: valeur as Ticket['status'] }
      return { ...ticket, adminComment: valeur }
    }))

    try {
      await ticketService.update(id, champ, valeur)
    } catch (cause) {
      setCharges(precedent)
      toast.erreurDe(cause, "Impossible de mettre à jour l'incident.")
    }
  }, [charges, toast])

  const supprimer = useCallback(async (ticket: Ticket) => {
    // Même filet que pour `modifier` : la ligne disparaît immédiatement du
    // tableau, et revient telle quelle si la base refuse la suppression.
    const precedent = charges
    setCharges(current => current.filter(autre => autre.id !== ticket.id))

    try {
      const { photoSupprimee } = await ticketService.supprimer(ticket.id, ticket.photoPath)

      // La fiche est bel et bien supprimée : annoncer un échec serait faux.
      // Reste à signaler le fichier orphelin, que plus rien ne rattache à un
      // incident et que la purge nocturne ne trouvera jamais.
      if (photoSupprimee) toast.succes(`Incident n° ${ticket.id} supprimé.`)
      else toast.erreur(`Incident n° ${ticket.id} supprimé, mais sa photo n'a pas pu être retirée du stockage.`)
    } catch (cause) {
      setCharges(precedent)
      toast.erreurDe(cause, "Impossible de supprimer l'incident.")
      throw cause
    }
  }, [charges, toast])

  const valeur = useMemo<TicketsContextValue>(
    () => ({ tickets, chargement, recharger, modifier, supprimer }),
    [tickets, chargement, recharger, modifier, supprimer],
  )

  return <TicketsContext value={valeur}>{children}</TicketsContext>
}
