import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { utilisateurService } from '../services/utilisateurs'
import type { Profil } from '../types/auth'
import { AuthContext, type AuthContextValue } from './authContext'

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Fournit l'état d'authentification à toute l'application.
 *
 * Être connecté ne suffit pas : il faut aussi disposer d'une ligne active dans
 * `utilisateurs`. Un compte `auth.users` sans profil actif est traité comme un
 * visiteur anonyme, ce qui reflète exactement ce qu'autorisent les politiques RLS.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let monte = true

    const appliquer = async (userId: string | undefined) => {
      if (!userId) {
        if (monte) {
          setProfil(null)
          setChargement(false)
        }
        return
      }

      try {
        const trouve = await utilisateurService.getProfil(userId)
        if (monte) setProfil(trouve?.actif ? trouve : null)
      } catch {
        // Un profil illisible équivaut à un accès refusé : on ne bloque pas
        // l'application, on la laisse en visiteur anonyme.
        if (monte) setProfil(null)
      } finally {
        if (monte) setChargement(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void appliquer(data.session?.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evenement, session) => {
      // NE JAMAIS faire d'`await` directement dans ce rappel : le client
      // Supabase sérialise les opérations d'authentification, et attendre une
      // requête ici bloque définitivement le client (interface figée sur
      // l'écran de chargement, sans aucune erreur). On repousse donc le
      // chargement du profil hors du rappel.
      queueMicrotask(() => { void appliquer(session?.user.id) })
    })

    return () => {
      monte = false
      subscription.unsubscribe()
    }
  }, [])

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    if (error) throw new Error('Adresse e-mail ou mot de passe incorrect.')
  }, [])

  const deconnexion = useCallback(async () => {
    await supabase.auth.signOut()
    setProfil(null)
  }, [])

  const valeur = useMemo<AuthContextValue>(
    () => ({ profil, chargement, connexion, deconnexion }),
    [profil, chargement, connexion, deconnexion],
  )

  return <AuthContext value={valeur}>{children}</AuthContext>
}
