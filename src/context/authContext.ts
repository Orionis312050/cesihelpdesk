import { createContext } from 'react'
import type { Profil } from '../types/auth'

/** Valeur exposée par le contexte d'authentification. */
export interface AuthContextValue {
  /** Profil du membre du personnel connecté, `null` si visiteur anonyme */
  profil: Profil | null
  /** `true` tant que la session initiale n'est pas résolue */
  chargement: boolean
  /** Connexion par e-mail et mot de passe */
  connexion: (email: string, motDePasse: string) => Promise<void>
  /** Déconnexion */
  deconnexion: () => Promise<void>
}

/**
 * Contexte d'authentification.
 *
 * Séparé du composant `AuthProvider` : `eslint-plugin-react-refresh` interdit
 * qu'un même fichier exporte un composant et autre chose.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
