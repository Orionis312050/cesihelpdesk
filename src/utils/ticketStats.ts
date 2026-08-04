/**
 * Calcul des statistiques du tableau de bord.
 *
 * Fonctions pures : aucune dépendance à React ni au réseau, donc directement
 * testables. Le calcul se fait dans le navigateur sur la liste déjà chargée —
 * une vue SQL dédiée éclaterait la définition des indicateurs entre deux
 * langages pour un volume qui tient largement en mémoire. À revoir au-delà de
 * quelques dizaines de milliers de tickets.
 */

import type { Status, Ticket } from '../types/helpdesk'

/** Noms de mois abrégés, pour l'axe de l'histogramme. */
export const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

/** Répartition d'une valeur, utilisée par les graphiques. */
export interface Part {
  libelle: string
  valeur: number
  /** Pourcentage du total, entre 0 et 100 */
  pourcentage: number
}

/** Ensemble des indicateurs affichés sur la page Statistiques. */
export interface Statistiques {
  /** Années présentes dans les données, de la plus récente à la plus ancienne */
  anneesDisponibles: number[]
  /** Nombre d'incidents sur l'année sélectionnée */
  total: number
  /** Nombre d'incidents par statut, sur l'année */
  parStatut: Record<Status, number>
  /** Incidents non terminés, tous statuts ouverts confondus */
  ouverts: number
  /** Incidents déclarés avec un risque d'accident */
  risques: number
  /** Part des incidents à risque, en pourcentage */
  tauxRisque: number
  /** Volume mensuel, 12 entrées de janvier à décembre */
  volumeMensuel: number[]
  /** Répartition par type d'incident, du plus fréquent au moins fréquent */
  parType: Part[]
  /** Cinq salles les plus touchées */
  topSalles: Part[]
  /** Délai moyen de résolution en jours, `null` si aucun incident résolu */
  delaiMoyenResolution: number | null
  /** Âge moyen en jours des incidents encore ouverts, `null` si aucun */
  ageMoyenOuverts: number | null
  /** Incidents ouverts depuis plus de 30 jours */
  ouvertsAncien: number
  /** Nombre d'incidents déclarés ces 7 derniers jours */
  septDerniersJours: number
  /** Nombre d'incidents déclarés les 7 jours précédents */
  septJoursPrecedents: number
}

const MS_PAR_JOUR = 86_400_000

/** Construit une répartition triée, en pourcentage du total. */
const repartition = (comptes: Map<string, number>, limite?: number): Part[] => {
  const total = [...comptes.values()].reduce((somme, valeur) => somme + valeur, 0)
  const parts = [...comptes.entries()]
    .map(([libelle, valeur]) => ({
      libelle,
      valeur,
      pourcentage: total === 0 ? 0 : (valeur / total) * 100,
    }))
    .sort((a, b) => b.valeur - a.valeur || a.libelle.localeCompare(b.libelle, 'fr'))

  return limite ? parts.slice(0, limite) : parts
}

/**
 * Calcule tous les indicateurs pour une année donnée.
 *
 * @param tickets Liste complète des tickets.
 * @param annee Année à analyser.
 * @param maintenant Date de référence, injectable pour les tests.
 * @returns Les indicateurs de l'année demandée.
 *
 * @example
 * const stats = calculerStatistiques(tickets, 2026)
 * stats.parStatut.NOUVEAU // 3
 */
export const calculerStatistiques = (
  tickets: Ticket[],
  annee: number,
  maintenant: Date = new Date(),
): Statistiques => {
  const anneesDisponibles = [...new Set(tickets.map(t => new Date(t.createdAt).getFullYear()))]
    .sort((a, b) => b - a)

  const deLAnnee = tickets.filter(t => new Date(t.createdAt).getFullYear() === annee)

  // Les quatre statuts sont comptés séparément. La version précédente
  // additionnait NOUVEAU et EN_COURS dans une seule carte, ce qui masquait
  // exactement l'information utile : combien de tickets ne sont pas encore pris
  // en charge.
  const parStatut: Record<Status, number> = { NOUVEAU: 0, EN_COURS: 0, EN_ATTENTE: 0, TERMINE: 0 }
  for (const ticket of deLAnnee) parStatut[ticket.status] += 1

  const comptesType = new Map<string, number>()
  const comptesSalle = new Map<string, number>()
  const volumeMensuel = new Array<number>(12).fill(0)

  for (const ticket of deLAnnee) {
    volumeMensuel[new Date(ticket.createdAt).getMonth()] += 1
    for (const type of ticket.types) comptesType.set(type, (comptesType.get(type) ?? 0) + 1)
    if (ticket.room) comptesSalle.set(ticket.room, (comptesSalle.get(ticket.room) ?? 0) + 1)
  }

  const resolus = deLAnnee.filter(t => t.resolvedAt)
  const delaiMoyenResolution = resolus.length === 0
    ? null
    : resolus.reduce((somme, t) =>
        somme + (new Date(t.resolvedAt as string).getTime() - new Date(t.createdAt).getTime()), 0)
      / resolus.length / MS_PAR_JOUR

  const ouvertsListe = deLAnnee.filter(t => t.status !== 'TERMINE')
  const ageMoyenOuverts = ouvertsListe.length === 0
    ? null
    : ouvertsListe.reduce((somme, t) =>
        somme + (maintenant.getTime() - new Date(t.createdAt).getTime()), 0)
      / ouvertsListe.length / MS_PAR_JOUR

  const risques = deLAnnee.filter(t => t.risk).length

  // La tendance se calcule sur l'ensemble des tickets et non sur l'année
  // sélectionnée : début janvier, la semaine précédente appartient à l'année
  // d'avant, et la comparaison serait fausse.
  const bornes = (joursAvant: number) => maintenant.getTime() - joursAvant * MS_PAR_JOUR
  const dansIntervalle = (t: Ticket, debut: number, fin: number) => {
    const date = new Date(t.createdAt).getTime()
    return date > debut && date <= fin
  }
  const septDerniersJours = tickets.filter(t => dansIntervalle(t, bornes(7), maintenant.getTime())).length
  const septJoursPrecedents = tickets.filter(t => dansIntervalle(t, bornes(14), bornes(7))).length

  return {
    anneesDisponibles,
    total: deLAnnee.length,
    parStatut,
    ouverts: ouvertsListe.length,
    risques,
    tauxRisque: deLAnnee.length === 0 ? 0 : (risques / deLAnnee.length) * 100,
    volumeMensuel,
    parType: repartition(comptesType),
    topSalles: repartition(comptesSalle, 5),
    delaiMoyenResolution,
    ageMoyenOuverts,
    ouvertsAncien: ouvertsListe.filter(t =>
      maintenant.getTime() - new Date(t.createdAt).getTime() > 30 * MS_PAR_JOUR).length,
    septDerniersJours,
    septJoursPrecedents,
  }
}

/** Formate un nombre de jours pour l'affichage (« 3,4 j »). */
export const formaterJours = (jours: number | null): string =>
  jours === null ? '—' : `${jours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j`
