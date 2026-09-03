/**
 * Service de chargement des données de référence du helpdesk : salles et
 * catégories d'incident actives, telles que proposées dans le formulaire.
 *
 * Ces deux listes changent très rarement et sont demandées à chaque ouverture du
 * formulaire public : elles sont donc mises en cache pendant 5 minutes. La
 * gestion des salles (écriture, salles inactives) est dans `salles.ts`.
 *
 * Ce sont les deux seules tables lisibles sans être connecté — le formulaire de
 * déclaration en a besoin avant toute authentification (voir les politiques RLS
 * dans `docs/03-base-de-donnees.md`).
 */

import { supabase } from '../lib/supabase'

/** Ligne d'une table de référence identifiée par un nom. */
type NamedRow = { id: number; nom: string }

/** Ligne de la table des catégories d'incident. */
type CategoryRow = { id: number; label: string }

let cachedRooms: string[] | null = null
let cachedIncidentTypes: string[] | null = null
let cacheTime = 0

/** Durée de validité du cache, en millisecondes (5 minutes). */
const CACHE_DURATION = 5 * 60 * 1000

/** Indique si le cache est encore valide. */
const isCacheFresh = () => Date.now() - cacheTime < CACHE_DURATION

export const helpdeskDataService = {
  /**
   * Récupère la liste des salles, triée par ordre alphabétique.
   * Le résultat est mis en cache pendant 5 minutes.
   *
   * @returns Liste des noms de salles.
   * @throws {Error} Si la requête Supabase échoue.
   *
   * @example
   * const rooms = await helpdeskDataService.getRooms()
   * // ['A101', 'A102', 'Amphithéâtre Pascal']
   */
  async getRooms(): Promise<string[]> {
    if (cachedRooms && isCacheFresh()) return cachedRooms

    // Le filtre `actif` est explicite : pour un visiteur anonyme, la politique
    // RLS l'applique déjà, mais le personnel connecté voit aussi les salles
    // désactivées, qui ne doivent pas être proposées à la saisie.
    const { data, error } = await supabase
      .from('salles')
      .select('id, nom')
      .eq('actif', true)
      .order('nom', { ascending: true })
    if (error) throw new Error(`Impossible de charger les salles : ${error.message}`)

    cachedRooms = (data as NamedRow[]).map(row => row.nom)
    cacheTime = Date.now()
    return cachedRooms
  },

  /**
   * Récupère la liste des types d'incident, triée par ordre alphabétique.
   * Le résultat est mis en cache pendant 5 minutes.
   *
   * @returns Liste des libellés de catégories d'incident.
   * @throws {Error} Si la requête Supabase échoue.
   *
   * @example
   * const types = await helpdeskDataService.getIncidentTypes()
   * // ['Chauffage / Climatisation', 'Électricité', 'Réseau / Wi-Fi']
   */
  async getIncidentTypes(): Promise<string[]> {
    if (cachedIncidentTypes && isCacheFresh()) return cachedIncidentTypes

    const { data, error } = await supabase
      .from('categories_incident')
      .select('id, label')
      .eq('actif', true)
      .order('label', { ascending: true })
    if (error) throw new Error(`Impossible de charger les types d'incident : ${error.message}`)

    cachedIncidentTypes = (data as CategoryRow[]).map(row => row.label)
    cacheTime = Date.now()
    return cachedIncidentTypes
  },

  /**
   * Vide le cache des salles et des types d'incident.
   * À appeler après une modification des tables de référence.
   *
   * @example
   * helpdeskDataService.clearCache() // force un rechargement au prochain appel
   */
  clearCache() {
    cachedRooms = null
    cachedIncidentTypes = null
    cacheTime = 0
  },
}
