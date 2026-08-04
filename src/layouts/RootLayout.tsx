import { Outlet } from 'react-router'
import { AppFooter } from '../components/layout/AppFooter/AppFooter'
import { AppHeader } from '../components/layout/AppHeader/AppHeader'
import { AuthProvider } from '../context/AuthProvider'
import { TicketsProvider } from '../context/TicketsProvider'
import { ToastProvider } from '../context/ToastProvider'
import { isSupabaseConfigured } from '../lib/supabase'
import { MissingConfigPage } from '../pages/MissingConfigPage/MissingConfigPage'

/**
 * Ossature commune à toutes les pages : en-tête, contenu, pied de page,
 * et les fournisseurs de contexte (authentification, notifications, tickets).
 */
export const RootLayout = () => {
  // Sans variables d'environnement, chaque appel réseau échouerait avec une
  // erreur incompréhensible. Mieux vaut expliquer ce qui manque.
  if (!isSupabaseConfigured) return <MissingConfigPage />

  return (
    <ToastProvider>
      <AuthProvider>
        <TicketsProvider>
          <div className="min-h-screen flex flex-col bg-cesi-gris text-cesi-noir font-sans selection:bg-cesi-jaune selection:text-black">
            <AppHeader />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
              <Outlet />
            </main>
            <AppFooter />
          </div>
        </TicketsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
