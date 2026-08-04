import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../context/authContext'

/**
 * Accède à l'état d'authentification.
 *
 * @returns Profil connecté, état de chargement et actions de connexion.
 * @throws {Error} Si appelé en dehors de `<AuthProvider>`.
 *
 * @example
 * const { profil, deconnexion } = useAuth()
 * if (profil?.role === 'admin') { ... }
 */
export const useAuth = (): AuthContextValue => {
  const contexte = useContext(AuthContext)
  if (!contexte) throw new Error('useAuth doit être utilisé dans un <AuthProvider>.')
  return contexte
}
