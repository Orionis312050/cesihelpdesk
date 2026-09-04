import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { SuppressionIncident } from '../../components/admin/SuppressionIncident/SuppressionIncident'
import { Icons } from '../../components/ui/Icons/Icons'
import { STATUSES, STATUS_ORDER } from '../../data/helpdesk'
import { useTickets } from '../../hooks/useTickets'
import { useToast } from '../../hooks/useToast'
import { storageService } from '../../services/storage'
import { ticketService } from '../../services/tickets'
import { utilisateurService } from '../../services/utilisateurs'
import type { Profil } from '../../types/auth'
import type { Ticket } from '../../types/helpdesk'

const dateComplete = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full', timeStyle: 'short',
})

const dateCourte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

/** Délai écoulé exprimé en jours, pour situer l'ancienneté d'un incident. */
const anciennete = (depuis: string, jusqua: string | null): string => {
  const debut = new Date(depuis).getTime()
  const fin = jusqua ? new Date(jusqua).getTime() : Date.now()
  const jours = Math.floor((fin - debut) / 86_400_000)
  if (jours <= 0) return "moins d'un jour"
  return jours === 1 ? '1 jour' : `${jours} jours`
}

/**
 * Fiche complète d'un incident.
 *
 * Anciennement une fenêtre modale : c'est désormais une page à part entière,
 * pour que « le lien pour accéder à la fiche complète » du cahier des charges
 * soit une vraie URL, transmissible et ajoutable aux favoris. Cela règle aussi
 * les problèmes d'accessibilité d'une modale (piège de focus, touche Échap).
 */
export const IncidentDetailPage = () => {
  const { id } = useParams()
  const [parametres] = useSearchParams()
  const navigate = useNavigate()
  const { tickets, modifier, supprimer } = useTickets()
  const toast = useToast()

  const [charge, setCharge] = useState<Ticket | null>(null)
  const [chargement, setChargement] = useState(true)
  const [introuvable, setIntrouvable] = useState(false)
  const [equipe, setEquipe] = useState<Profil[]>([])
  const [photoSignee, setPhotoSignee] = useState<{ chemin: string; url: string } | null>(null)
  const [commentaire, setCommentaire] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<Ticket | null>(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  const retour = parametres.get('retour')
  const lienRetour = retour ? `/suivi?${retour}` : '/suivi'

  // La liste partagée fournit un affichage immédiat quand on arrive depuis le
  // tableau de suivi ; la version rechargée depuis la base prend le relais et
  // permet l'accès direct par URL (nouvel onglet, lien transmis par un collègue).
  const ticket = charge ?? tickets.find(t => t.id === id) ?? null

  useEffect(() => {
    if (!id) return
    let monte = true

    ticketService.getById(id)
      .then(trouve => {
        if (!monte) return
        if (!trouve) { setIntrouvable(true); return }
        setCharge(trouve)
      })
      .catch((cause: unknown) => { if (monte) toast.erreurDe(cause, 'Impossible de charger la fiche.') })
      .finally(() => { if (monte) setChargement(false) })

    return () => { monte = false }
  }, [id, toast])

  useEffect(() => {
    utilisateurService.listActifs().then(setEquipe).catch(() => setEquipe([]))
  }, [])

  // Les photos vivent dans un bucket privé : il faut une URL signée, valable une
  // heure, régénérée à chaque ouverture de la fiche. L'URL est conservée avec
  // son chemin d'origine pour ne jamais afficher la photo d'un autre incident.
  useEffect(() => {
    const chemin = ticket?.photoPath
    if (!chemin) return
    let monte = true
    storageService.urlSignee(chemin).then(url => { if (monte && url) setPhotoSignee({ chemin, url }) })
    return () => { monte = false }
  }, [ticket?.photoPath])

  const urlPhoto = photoSignee?.chemin === ticket?.photoPath ? photoSignee?.url ?? null : null
  const commentaireAffiche = commentaire ?? ticket?.adminComment ?? ''

  const appliquer = async (champ: 'status' | 'handler' | 'adminComment', valeur: string) => {
    if (!ticket) return
    await modifier(ticket.id, champ, valeur)
    setCharge(current => {
      if (!current) return current
      if (champ === 'status') return { ...current, status: valeur as Ticket['status'] }
      if (champ === 'handler') {
        return { ...current, handlerId: valeur || null, handler: equipe.find(m => m.id === valeur)?.nomComplet ?? '' }
      }
      return { ...current, adminComment: valeur }
    })
  }

  const confirmerSuppression = async () => {
    if (!ticket) return
    setSuppressionEnCours(true)
    try {
      await supprimer(ticket)
      // `replace` : le bouton Précédent ne doit pas ramener sur la fiche d'un
      // incident qui n'existe plus, qui n'afficherait qu'« Incident introuvable ».
      navigate(lienRetour, { replace: true })
    } catch {
      // Le contexte a déjà notifié la cause du refus. La fiche est intacte :
      // on referme simplement la fenêtre de confirmation.
      setSuppressionEnCours(false)
      setASupprimer(null)
    }
  }

  if (chargement && !ticket) {
    return (
      <div className="flex justify-center py-24" role="status" aria-live="polite">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">Chargement de la fiche…</span>
      </div>
    )
  }

  if (introuvable || !ticket) {
    return (
      <div className="max-w-xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-8 text-center">
        <h1 className="text-2xl font-black uppercase mb-3">Incident introuvable</h1>
        <p className="text-gray-600 mb-6">
          L'incident n° {id} n'existe pas ou a été supprimé.
        </p>
        <Link to={lienRetour} className="inline-block bg-black text-white font-bold px-6 py-3 rounded hover:bg-gray-800 transition-colors">
          Retour au suivi
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        to={lienRetour}
        className="inline-flex items-center gap-2 text-sm font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded"
      >
        <Icons.ArrowLeft /> Retour au suivi
      </Link>

      <article className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
        <header className="bg-cesi-jaune border-b-4 border-black p-6">
          <p className="text-sm font-bold uppercase tracking-wide">Incident n° {ticket.id}</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">{ticket.title}</h1>
        </header>

        {ticket.risk && (
          <p className="bg-red-700 text-white p-4 font-bold flex items-center gap-2">
            <Icons.Alert /> Risque d'accident ou de blessure signalé
          </p>
        )}

        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-bold text-gray-500">Demandeur</dt>
              <dd>
                {ticket.name}<br />
                <a href={`mailto:${ticket.email}`} className="underline hover:no-underline break-all">{ticket.email}</a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-gray-500">Déclaré le</dt>
              <dd>
                {dateComplete.format(new Date(ticket.createdAt))}
                <span className="block text-gray-500 text-xs mt-0.5">
                  {ticket.resolvedAt
                    ? `Résolu en ${anciennete(ticket.createdAt, ticket.resolvedAt)}`
                    : `Ouvert depuis ${anciennete(ticket.createdAt, null)}`}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-gray-500">Localisation</dt>
              <dd className="font-bold">{ticket.room}</dd>
            </div>
            <div>
              <dt className="font-bold text-gray-500">Type(s) d'incident</dt>
              <dd>{ticket.types.join(', ') || <span className="text-gray-400 italic">Non précisé</span>}</dd>
            </div>
          </dl>

          <section>
            <h2 className="font-bold text-gray-500 text-sm mb-1">Description</h2>
            <p className="bg-gray-50 border border-gray-200 p-3 rounded text-sm whitespace-pre-wrap">{ticket.comment}</p>
          </section>

          {ticket.photoPath && (
            <section>
              <h2 className="font-bold text-gray-500 text-sm mb-1">Photo jointe</h2>
              {urlPhoto ? (
                <a href={urlPhoto} target="_blank" rel="noreferrer" className="inline-block">
                  <img
                    src={urlPhoto}
                    alt={`Photo de l'incident n° ${ticket.id} en ${ticket.room}`}
                    className="max-h-80 rounded border-2 border-gray-200 hover:border-black transition-colors"
                  />
                </a>
              ) : (
                <p className="text-sm text-gray-500 italic">Chargement de la photo…</p>
              )}
            </section>
          )}

          {/* La purge automatique (six mois, voir docs/04) laisse cette trace :
              sans elle, l'agent prendrait la photo pour perdue. */}
          {!ticket.photoPath && ticket.photoDeletedAt && (
            <section>
              <h2 className="font-bold text-gray-500 text-sm mb-1">Photo jointe</h2>
              <p className="text-sm text-gray-500 italic">
                Photo supprimée automatiquement le {dateCourte.format(new Date(ticket.photoDeletedAt))},
                la durée de conservation étant atteinte.
              </p>
            </section>
          )}

          <section className="border-t-2 border-gray-100 pt-6 space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight">Traitement</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="statut" className="block text-sm font-bold mb-1">Statut</label>
                <select
                  id="statut"
                  value={ticket.status}
                  onChange={e => void appliquer('status', e.target.value)}
                  className={`w-full border-2 border-gray-200 rounded p-2 min-h-11 focus:border-black outline-none font-bold ${STATUSES[ticket.status].color}`}
                >
                  {STATUS_ORDER.map(cle => (
                    <option key={cle} value={cle}>{STATUSES[cle].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="traitant" className="block text-sm font-bold mb-1">Traitant</label>
                <select
                  id="traitant"
                  value={ticket.handlerId ?? ''}
                  onChange={e => void appliquer('handler', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded p-2 min-h-11 focus:border-black outline-none bg-white"
                >
                  <option value="">Non assigné</option>
                  {equipe.map(membre => (
                    <option key={membre.id} value={membre.id}>{membre.nomComplet}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="commentaire" className="block text-sm font-bold mb-1">
                Commentaire de suivi (résolution, pièces commandées…)
              </label>
              <textarea
                id="commentaire"
                rows={4}
                value={commentaireAffiche}
                onChange={e => setCommentaire(e.target.value)}
                onBlur={() => { if (commentaireAffiche !== ticket.adminComment) void appliquer('adminComment', commentaireAffiche) }}
                placeholder="Notez ici les étapes de résolution…"
                className="w-full border-2 border-gray-200 rounded p-2 focus:border-black outline-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Enregistré automatiquement en quittant le champ.</p>
            </div>
          </section>

          {/* Ouvert à tout le personnel, techniciens compris : la base
              applique la même règle (`tickets_suppression_personnel`). */}
          <section className="border-t-2 border-gray-100 pt-6">
            <h2 className="text-lg font-black uppercase tracking-tight">Suppression</h2>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Réservée aux doublons, aux essais et aux signalements déposés par erreur.
              Un incident réellement traité se clôture en le passant en
              « Terminé » : il reste alors dans l'historique et dans les statistiques.
            </p>
            <button
              type="button"
              onClick={() => setASupprimer(ticket)}
              className="flex items-center gap-2 border-2 border-red-700 text-red-700 px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-red-700 hover:text-white transition-colors"
            >
              <Icons.Trash /> Supprimer l'incident
            </button>
          </section>
        </div>
      </article>

      <SuppressionIncident
        ticket={aSupprimer}
        occupe={suppressionEnCours}
        onConfirmer={() => void confirmerSuppression()}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}
