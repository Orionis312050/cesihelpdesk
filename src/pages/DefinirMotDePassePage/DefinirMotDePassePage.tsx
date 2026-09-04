import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'

/** Longueur minimale exigée à la saisie. La base en accepte moins ; on est plus strict ici. */
const LONGUEUR_MINIMALE = 8

type Etape = 'verification' | 'saisie' | 'lien-invalide'

/**
 * Écran d'arrivée des liens produits depuis la page « Utilisateurs » :
 * activation d'un compte invité comme réinitialisation d'un mot de passe oublié.
 *
 * Le lien porte le jeton dans le FRAGMENT (`#token=…`), que le navigateur
 * n'envoie jamais au serveur. `verifyOtp` l'échange contre une session, le
 * fragment est aussitôt effacé de la barre d'adresse, puis la personne choisit
 * son mot de passe et se retrouve connectée.
 *
 * Le jeton est à USAGE UNIQUE : rouvrir le lien après coup affiche l'écran
 * « lien invalide », ce qui est le comportement attendu — pas une panne.
 */
export const DefinirMotDePassePage = () => {
  const navigate = useNavigate()

  // Lu une seule fois, à la première image : l'effet efface le fragment de la
  // barre d'adresse juste après, il n'y serait plus au rendu suivant.
  const [jeton] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token'))

  const [etape, setEtape] = useState<Etape>(jeton ? 'verification' : 'lien-invalide')
  const [erreur, setErreur] = useState<string | null>(
    jeton ? null : 'Ce lien est incomplet. Copiez-le en entier, y compris ce qui suit le « # ».',
  )
  const [compte, setCompte] = useState<string | null>(null)
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [envoi, setEnvoi] = useState(false)

  // Le jeton ne vaut qu'une fois : le double montage de <StrictMode> en
  // développement le consommerait à vide et l'écran afficherait « lien
  // invalide » alors que le lien était bon.
  const dejaVerifie = useRef(false)

  useEffect(() => {
    if (!jeton || dejaVerifie.current) return
    dejaVerifie.current = true

    // Effacé sans attendre la réponse : le jeton n'a rien à faire dans la barre
    // d'adresse, ni dans l'historique du navigateur.
    window.history.replaceState(null, '', window.location.pathname)

    void supabase.auth.verifyOtp({ token_hash: jeton, type: 'recovery' }).then(({ data, error }) => {
      if (error || !data.session) {
        setEtape('lien-invalide')
        setErreur('Ce lien a expiré ou a déjà servi. Demandez-en un nouveau à un administrateur.')
        return
      }
      setCompte(data.user?.email ?? null)
      setEtape('saisie')
    })
  }, [jeton])

  const enregistrer = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    setErreur(null)

    if (motDePasse.length < LONGUEUR_MINIMALE) {
      setErreur(`Le mot de passe doit compter au moins ${LONGUEUR_MINIMALE} caractères.`)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux saisies ne correspondent pas.')
      return
    }

    setEnvoi(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    setEnvoi(false)

    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      return
    }

    // La session est déjà ouverte : la personne arrive directement sur le suivi.
    navigate('/suivi', { replace: true })
  }

  return (
    <div className="max-w-md mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden mt-8">
      <div className="bg-cesi-jaune border-b-4 border-black p-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">Votre mot de passe</h1>
        <p className="font-medium mt-1 text-sm">
          {compte ? `Compte ${compte}` : 'Choisissez le mot de passe de votre compte.'}
        </p>
      </div>

      {etape === 'verification' && (
        <div className="p-8 flex flex-col items-center gap-4" role="status" aria-live="polite">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-gray-600">Vérification du lien…</p>
        </div>
      )}

      {etape === 'lien-invalide' && (
        <div className="p-6 space-y-4">
          <p role="alert" className="bg-red-50 border-l-4 border-red-600 text-red-800 text-sm p-3 rounded">
            {erreur}
          </p>
          <Link
            to="/connexion"
            className="block w-full text-center bg-black text-white text-lg font-bold py-4 rounded hover:bg-gray-800 transition-colors"
          >
            RETOUR À LA CONNEXION
          </Link>
        </div>
      )}

      {etape === 'saisie' && (
        <form onSubmit={enregistrer} className="p-6 space-y-5" noValidate>
          {erreur && (
            <p role="alert" className="bg-red-50 border-l-4 border-red-600 text-red-800 text-sm p-3 rounded">
              {erreur}
            </p>
          )}

          <div>
            <label htmlFor="nouveau-mot-de-passe" className="block text-sm font-bold mb-1">
              Nouveau mot de passe
            </label>
            <input
              id="nouveau-mot-de-passe"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              value={motDePasse}
              onChange={event => setMotDePasse(event.target.value)}
              aria-describedby="aide-mot-de-passe"
              className="w-full border-2 border-gray-200 rounded p-3 focus:border-black outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
            />
            <p id="aide-mot-de-passe" className="text-xs text-gray-500 mt-1">
              {LONGUEUR_MINIMALE} caractères au minimum.
            </p>
          </div>

          <div>
            <label htmlFor="confirmation-mot-de-passe" className="block text-sm font-bold mb-1">
              Confirmation
            </label>
            <input
              id="confirmation-mot-de-passe"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              className="w-full border-2 border-gray-200 rounded p-3 focus:border-black outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={envoi}
            className="w-full bg-black text-white text-lg font-bold py-4 rounded hover:bg-gray-800 transition-colors active:translate-y-1 disabled:opacity-60"
          >
            {envoi ? 'ENREGISTREMENT…' : 'ENREGISTRER ET SE CONNECTER'}
          </button>
        </form>
      )}
    </div>
  )
}
