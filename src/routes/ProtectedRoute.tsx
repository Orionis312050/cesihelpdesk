import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types/auth'

interface ProtectedRouteProps {
  /** Si renseigné, seuls ces rôles ont accès */
  roles?: Role[]
}

/**
 * Protège les écrans de l'espace d'administration.
 *
 * Ce garde-fou est un confort d'interface, pas une mesure de sécurité : les
 * données sont protégées par les politiques RLS côté base. Contourner cet écran
 * ne donne accès à rien.
 */
export const ProtectedRoute = ({ roles }: ProtectedRouteProps) => {
  const { profil, chargement } = useAuth()
  const emplacement = useLocation()

  // Sans cet état d'attente, chaque rafraîchissement (F5) afficherait un éclair
  // de page de connexion avant que la session enregistrée ne soit relue.
  if (chargement) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4" role="status" aria-live="polite">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-gray-600">Vérification de votre session…</p>
      </div>
    )
  }

  if (!profil) {
    // `state` mémorise la page demandée pour y revenir après connexion.
    return <Navigate to="/connexion" replace state={{ depuis: emplacement.pathname + emplacement.search }} />
  }

  if (roles && !roles.includes(profil.role)) {
    return (
      <div className="max-w-xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-8 mt-8 text-center">
        <h1 className="text-2xl font-black uppercase mb-3">Accès réservé</h1>
        <p className="text-gray-600">
          Cette page est réservée aux administrateurs. Votre compte est enregistré comme
          {' '}<strong>{profil.role}</strong>.
        </p>
      </div>
    )
  }

  return <Outlet />
}
