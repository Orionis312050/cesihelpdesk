import { isRouteErrorResponse, useRouteError } from 'react-router'

/**
 * Filet de sécurité pour toute erreur non rattrapée dans l'arbre de routes.
 *
 * Rattaché à la route racine via `errorElement`, il remplace l'écran blanc que
 * produisait jusqu'ici la moindre exception de rendu.
 */
export const RouteErrorPage = () => {
  const erreur = useRouteError()

  const detail = isRouteErrorResponse(erreur)
    ? `${erreur.status} ${erreur.statusText}`
    : erreur instanceof Error
      ? erreur.message
      : 'Erreur inconnue'

  return (
    <div className="min-h-screen bg-cesi-gris text-cesi-noir font-sans flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
        <div className="bg-cesi-jaune border-b-4 border-black p-6">
          <h1 className="text-2xl font-black uppercase tracking-tight">Une erreur est survenue</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            L'application a rencontré un problème inattendu. Votre saisie en cours
            n'a pas été enregistrée.
          </p>
          <p className="text-sm font-mono bg-gray-100 border border-gray-200 rounded p-3 break-words">{detail}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-black text-white font-bold px-5 py-3 rounded hover:bg-gray-800 transition-colors"
            >
              Recharger la page
            </button>
            <a
              href="/signaler"
              className="border-2 border-black font-bold px-5 py-3 rounded hover:bg-gray-100 transition-colors"
            >
              Revenir à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
