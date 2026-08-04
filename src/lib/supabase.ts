/**
 * Client Supabase partagé par toute l'application.
 *
 * Il doit rester **unique** : chaque appel à `createClient` instancie son propre
 * client d'authentification (GoTrue). Deux instances partageant la même clé de
 * stockage se disputent le rafraîchissement du jeton et provoquent des
 * déconnexions aléatoires. Importez toujours `supabase` depuis ce module.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Indique si les variables d'environnement Supabase sont renseignées.
 * Permet à l'interface d'afficher un écran d'aide explicite plutôt que de
 * planter au premier appel réseau.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/**
 * Client Supabase de l'application (base de données, authentification, stockage).
 *
 * @example
 * const { data, error } = await supabase.from('salles').select('nom')
 */
export const supabase = createClient(url ?? 'http://localhost:54321', publishableKey ?? 'cle-absente', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
