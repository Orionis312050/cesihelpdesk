import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'

interface EtatNavigation {
  depuis?: string
}

/** Page de connexion à l'espace d'administration. */
export const LoginPage = () => {
  const { profil, chargement, connexion } = useAuth()
  const navigate = useNavigate()
  const emplacement = useLocation()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const destination = (emplacement.state as EtatNavigation | null)?.depuis ?? '/suivi'

  if (!chargement && profil) return <Navigate to={destination} replace />

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
      await connexion(email, motDePasse)
      navigate(destination, { replace: true })
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'Connexion impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden mt-8">
      <div className="bg-cesi-jaune border-b-4 border-black p-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Espace Administration</h1>
        <p className="font-medium mt-1 text-sm">Réservé au personnel du campus.</p>
      </div>

      <form onSubmit={soumettre} className="p-6 space-y-5" noValidate>
        {erreur && (
          <p role="alert" className="bg-red-50 border-l-4 border-red-600 text-red-800 text-sm p-3 rounded">
            {erreur}
          </p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-bold mb-1">Adresse e-mail</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="w-full border-2 border-gray-200 rounded p-3 focus:border-black outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
          />
        </div>

        <div>
          <label htmlFor="motdepasse" className="block text-sm font-bold mb-1">Mot de passe</label>
          <input
            id="motdepasse"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={event => setMotDePasse(event.target.value)}
            className="w-full border-2 border-gray-200 rounded p-3 focus:border-black outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={envoi}
          className="w-full bg-black text-white text-lg font-bold py-4 rounded hover:bg-gray-800 transition-colors active:translate-y-1 disabled:opacity-60"
        >
          {envoi ? 'CONNEXION…' : 'SE CONNECTER'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Pas de compte, ou mot de passe oublié ? Un administrateur vous transmet un lien
          pour en choisir un — aucun e-mail de récupération n'est envoyé automatiquement.
        </p>
      </form>
    </div>
  )
}
