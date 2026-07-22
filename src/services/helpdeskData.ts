/**
 * Service de gestion des données du helpdesk (Supabase)
 * Gère le chargement des salles et types d'incidents avec système de cache de 5 minutes
 * 
 * Le service détecte automatiquement l'environnement:
 * - DEV: Requêtes directes à Supabase
 * - PROD: Requêtes via API backend
 */

import { createClient } from '@supabase/supabase-js'

/** Interface pour une ligne de table avec id et nom */
type NamedRow = { id: number; nom: string }

/** Interface pour une catégorie d'incident */
type CategoryRow = { id: number; label: string }

// Client Supabase initialisé seulement en développement
const supabase = import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null

/**
 * Vérifie que Supabase est initialisé, sinon lance une erreur
 * @throws {Error} Si les variables d'environnement Supabase ne sont pas définies
 */
const requireSupabase = () => {
  if (!supabase) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis en développement.')
  return supabase
}

// Système de cache pour les données
let cachedRooms: string[] | null = null
let cachedIncidentTypes: string[] | null = null
let cacheTime = 0
/** Durée du cache: 5 minutes */
const CACHE_DURATION = 5 * 60 * 1000

/**
 * Service pour récupérer les données du helpdesk
 */
export const helpdeskDataService = {
  /**
   * Récupère la liste des salles (locations) disponibles
   * Les données sont mises en cache pendant 5 minutes
   * 
   * @returns {Promise<string[]>} Liste des noms de salles triées alphabétiquement
   * @throws {Error} Si la requête Supabase échoue
   * 
   * @example
   * const rooms = await helpdeskDataService.getRooms()
   * // ['Salle A', 'Salle B', 'Salle C']
   */
  async getRooms(): Promise<string[]> {
    if (import.meta.env.DEV) {
      // Retourne le cache s'il est encore valide
      if (cachedRooms && Date.now() - cacheTime < CACHE_DURATION) {
        return cachedRooms
      }

      const client = requireSupabase()
      const { data, error } = await client.from('salles').select('id, nom').order('nom', { ascending: true })
      if (error) throw error

      cachedRooms = (data as NamedRow[]).map(row => row.nom)
      cacheTime = Date.now()
      return cachedRooms
    }

    const response = await fetch('/api/helpdesk/rooms')
    if (!response.ok) throw new Error('Impossible de charger les salles.')
    return response.json() as Promise<string[]>
  },

  /**
   * Récupère la liste des types d'incidents disponibles
   * Les données sont mises en cache pendant 5 minutes
   * 
   * @returns {Promise<string[]>} Liste des types d'incidents triés alphabétiquement
   * @throws {Error} Si la requête Supabase échoue
   * 
   * @example
   * const types = await helpdeskDataService.getIncidentTypes()
   * // ['Électricité', 'Plomberie', 'Réseau']
   */
  async getIncidentTypes(): Promise<string[]> {
    if (import.meta.env.DEV) {
      // Retourne le cache s'il est encore valide
      if (cachedIncidentTypes && Date.now() - cacheTime < CACHE_DURATION) {
        return cachedIncidentTypes
      }

      const client = requireSupabase()
      const { data, error } = await client.from('categories_incident').select('id, label').order('label', { ascending: true })
      if (error) throw error

      cachedIncidentTypes = (data as CategoryRow[]).map(row => row.label)
      cacheTime = Date.now()
      return cachedIncidentTypes
    }

    const response = await fetch('/api/helpdesk/incident-types')
    if (!response.ok) throw new Error('Impossible de charger les types d\'incident.')
    return response.json() as Promise<string[]>
  },

  /**
   * Vide le cache des salles et types d'incidents
   * Utile après une création d'incident pour s'assurer des données fraîches
   * 
   * @example
   * await helpdeskDataService.createIncident(data)
   * helpdeskDataService.clearCache() // Force le rechargement au prochain appel
   */
  clearCache() {
    cachedRooms = null
    cachedIncidentTypes = null
  }
}
