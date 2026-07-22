import { createClient } from '@supabase/supabase-js'

type NamedRow = { id: number; nom: string }
type CategoryRow = { id: number; label: string }

const supabase = import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null

const requireSupabase = () => {
  if (!supabase) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis en développement.')
  return supabase
}

let cachedRooms: string[] | null = null
let cachedIncidentTypes: string[] | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const helpdeskDataService = {
  async getRooms(): Promise<string[]> {
    if (import.meta.env.DEV) {
      // Return from cache if still valid
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

  async getIncidentTypes(): Promise<string[]> {
    if (import.meta.env.DEV) {
      // Return from cache if still valid
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

  clearCache() {
    cachedRooms = null
    cachedIncidentTypes = null
  }
}
