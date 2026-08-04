/**
 * Filtrage et tri du tableau de suivi des incidents.
 *
 * Fonctions pures, sans React ni appel réseau : elles se testent directement et
 * gardent la page de suivi lisible.
 *
 * Volontairement limité à sept filtres nommés plutôt qu'à un moteur générique :
 * le cahier des charges demande « des filtres par colonne », pas un langage de
 * requête. Un moteur générique coûterait dix fois plus de code à maintenir.
 */

import type { Status, Ticket } from '../types/helpdesk'

/** Colonnes sur lesquelles le tri est possible. */
export type ColonneTri = 'date' | 'title' | 'room' | 'status' | 'handler'

/** Sens du tri. */
export type SensTri = 'asc' | 'desc'

/** Critères de filtrage, un par colonne du tableau. */
export interface FiltresTickets {
  /** Recherche libre sur le titre et la description */
  titre: string
  /** Date de déclaration minimale (AAAA-MM-JJ) */
  dateDebut: string
  /** Date de déclaration maximale (AAAA-MM-JJ) */
  dateFin: string
  /** Salles retenues ; vide = toutes */
  salles: string[]
  /** Types d'incident retenus ; vide = tous */
  types: string[]
  /** Statuts retenus ; vide = tous */
  statuts: Status[]
  /** Traitants retenus (nom affiché, `''` pour « non assigné ») ; vide = tous */
  traitants: string[]
  /** Filtre sur le risque d'accident ; `null` = sans distinction */
  risque: boolean | null
}

/** Filtres vides : aucun critère actif. */
export const FILTRES_VIDES: FiltresTickets = {
  titre: '',
  dateDebut: '',
  dateFin: '',
  salles: [],
  types: [],
  statuts: [],
  traitants: [],
  risque: null,
}

/**
 * Normalise une chaîne pour la comparaison : minuscules, sans accents.
 *
 * Indispensable en français : sans cela, chercher « electricite » ne trouve pas
 * « Électricité ».
 */
export const normaliser = (valeur: string): string =>
  valeur.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Indique si des critères sont actifs.
 *
 * @example
 * compterFiltresActifs({ ...FILTRES_VIDES, salles: ['B204'] }) // 1
 */
export const compterFiltresActifs = (filtres: FiltresTickets): number => {
  let total = 0
  if (filtres.titre.trim()) total += 1
  if (filtres.dateDebut) total += 1
  if (filtres.dateFin) total += 1
  if (filtres.salles.length) total += 1
  if (filtres.types.length) total += 1
  if (filtres.statuts.length) total += 1
  if (filtres.traitants.length) total += 1
  if (filtres.risque !== null) total += 1
  return total
}

/**
 * Applique tous les critères à la liste des tickets.
 *
 * Les critères se cumulent (ET logique) ; à l'intérieur d'un critère à choix
 * multiple, les valeurs s'additionnent (OU logique).
 *
 * @param tickets Liste complète.
 * @param filtres Critères à appliquer.
 * @returns Les tickets satisfaisant tous les critères.
 *
 * @example
 * filtrerTickets(tickets, { ...FILTRES_VIDES, statuts: ['NOUVEAU'], risque: true })
 */
export const filtrerTickets = (tickets: Ticket[], filtres: FiltresTickets): Ticket[] => {
  const recherche = normaliser(filtres.titre)

  return tickets.filter(ticket => {
    if (recherche) {
      const cible = `${normaliser(ticket.title)} ${normaliser(ticket.comment)} ${normaliser(ticket.name)} ${ticket.id}`
      if (!cible.includes(recherche)) return false
    }

    // `createdAt` est un horodatage complet ; on ne compare que la partie date
    // pour que « du 4 août au 4 août » retienne bien toute la journée.
    const jour = ticket.createdAt.slice(0, 10)
    if (filtres.dateDebut && jour < filtres.dateDebut) return false
    if (filtres.dateFin && jour > filtres.dateFin) return false

    if (filtres.salles.length && !filtres.salles.includes(ticket.room)) return false

    if (filtres.types.length && !filtres.types.some(type => ticket.types.includes(type))) return false

    if (filtres.statuts.length && !filtres.statuts.includes(ticket.status)) return false

    if (filtres.traitants.length && !filtres.traitants.includes(ticket.handler)) return false

    if (filtres.risque !== null && ticket.risk !== filtres.risque) return false

    return true
  })
}

/** Valeur de comparaison utilisée pour le tri d'une colonne. */
const cleTri = (ticket: Ticket, colonne: ColonneTri): string => {
  switch (colonne) {
    case 'date': return ticket.createdAt
    case 'title': return normaliser(ticket.title)
    case 'room': return normaliser(ticket.room)
    case 'status': return ticket.status
    case 'handler': return normaliser(ticket.handler)
  }
}

/**
 * Trie les tickets sur une colonne.
 *
 * @param tickets Liste à trier (non modifiée).
 * @param colonne Colonne de tri.
 * @param sens Ordre croissant ou décroissant.
 * @returns Une nouvelle liste triée.
 */
export const trierTickets = (tickets: Ticket[], colonne: ColonneTri, sens: SensTri): Ticket[] =>
  [...tickets].sort((a, b) => {
    const comparaison = cleTri(a, colonne).localeCompare(cleTri(b, colonne), 'fr', { numeric: true })
    return sens === 'asc' ? comparaison : -comparaison
  })

/** Liste triée et dédoublonnée des valeurs présentes dans une colonne. */
export const valeursDistinctes = (tickets: Ticket[], extraire: (ticket: Ticket) => string[]): string[] =>
  [...new Set(tickets.flatMap(extraire))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
