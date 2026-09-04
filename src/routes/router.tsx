import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from '../layouts/RootLayout'
import { LoginPage } from '../pages/LoginPage/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { ReportPage } from '../pages/ReportPage/ReportPage'
import { RouteErrorPage } from '../pages/RouteErrorPage/RouteErrorPage'
import { ProtectedRoute } from './ProtectedRoute'

/**
 * Table de routage de l'application.
 *
 * `createBrowserRouter` plutôt que `<BrowserRouter>` : il permet d'attacher un
 * `errorElement` à la racine, qui sert de barrière d'erreur pour tout l'arbre —
 * l'application n'avait jusqu'ici aucun filet en cas d'exception de rendu.
 *
 * Les écrans d'administration utilisent la propriété `lazy` de React Router :
 * leur code n'est téléchargé qu'à la première visite. Le formulaire public,
 * ouvert depuis un téléphone après un scan de QR code parfois sur un réseau
 * médiocre, n'embarque donc ni le tableau de suivi, ni les graphiques, ni la
 * bibliothèque d'export Excel.
 *
 * ATTENTION AU DÉPLOIEMENT : ces URL sont résolues côté navigateur. L'hébergeur
 * doit renvoyer `index.html` pour toute route inconnue, sinon un accès direct à
 * `/incident/12` renvoie une erreur 404 (voir `public/_redirects`).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/signaler" replace /> },

      // Parcours public
      { path: 'signaler', element: <ReportPage /> },
      // Cible des QR codes : la salle est pré-remplie et confirmée à l'écran.
      { path: 'salle/:salle', element: <ReportPage /> },
      { path: 'connexion', element: <LoginPage /> },
      // Arrivée des liens d'invitation et de mot de passe oublié, produits
      // depuis la page « Utilisateurs ». Publique par nécessité : la personne
      // n'a précisément pas encore de mot de passe.
      {
        path: 'definir-mot-de-passe',
        lazy: async () => ({ Component: (await import('../pages/DefinirMotDePassePage/DefinirMotDePassePage')).DefinirMotDePassePage }),
      },

      // Espace d'administration : personnel connecté, technicien ou administrateur
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'suivi',
            lazy: async () => ({ Component: (await import('../pages/IncidentListPage/IncidentListPage')).IncidentListPage }),
          },
          {
            path: 'incident/:id',
            lazy: async () => ({ Component: (await import('../pages/IncidentDetailPage/IncidentDetailPage')).IncidentDetailPage }),
          },
          {
            path: 'statistiques',
            lazy: async () => ({ Component: (await import('../pages/StatsPage/StatsPage')).StatsPage }),
          },
          { path: 'nouveau', element: <ReportPage /> },
          // Les affiches ne lisent que la liste publique des salles : un
          // technicien qui remplace une affiche abîmée n'a pas à solliciter un
          // administrateur pour la réimprimer.
          {
            path: 'qr-codes',
            lazy: async () => ({ Component: (await import('../pages/QrCodesPage/QrCodesPage')).QrCodesPage }),
          },
        ],
      },

      // Réservé aux administrateurs : référentiels et comptes
      {
        element: <ProtectedRoute roles={['admin']} />,
        children: [
          {
            path: 'salles',
            lazy: async () => ({ Component: (await import('../pages/SallesPage/SallesPage')).SallesPage }),
          },
          {
            path: 'utilisateurs',
            lazy: async () => ({ Component: (await import('../pages/UtilisateursPage/UtilisateursPage')).UtilisateursPage }),
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
