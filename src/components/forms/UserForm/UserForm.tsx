import { useEffect, useRef, useState, type FormEvent } from 'react'
import { helpdeskDataService } from '../../../services/helpdeskData'
import type { TicketInput } from '../../../types/helpdesk'
import type { ImageCompressee } from '../../../utils/imageCompression'
import { AutocompleteInput } from '../../ui/AutocompleteInput/AutocompleteInput'
import { PhotoUpload } from '../PhotoUpload/PhotoUpload'

interface UserFormProps {
  /** Envoie la déclaration. Reçoit la photo compressée à téléverser, s'il y en a une. */
  onSubmit: (data: TicketInput, photo: ImageCompressee | null) => Promise<void>
  /** Affiche le formulaire dans l'espace d'administration */
  isAdminContext: boolean
  /** Salle imposée par le QR code scanné */
  salleImposee?: string
}

/** Champs pouvant porter une erreur de validation. */
type ChampErreur = 'name' | 'email' | 'room' | 'title' | 'comment'

const FORMULAIRE_VIDE: TicketInput = {
  name: '', email: '', room: '', types: [], title: '', comment: '', risk: false, photoPath: null,
}

const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const classesChamp = (enErreur: boolean) =>
  `w-full border-2 rounded p-2 min-h-11 outline-none transition-colors ${
    enErreur ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-black'
  }`

export const UserForm = ({ onSubmit, isAdminContext, salleImposee }: UserFormProps) => {
  const [formData, setFormData] = useState<TicketInput>({
    ...FORMULAIRE_VIDE,
    room: salleImposee ?? '',
  })
  const [photo, setPhoto] = useState<ImageCompressee | null>(null)
  const [erreurs, setErreurs] = useState<Partial<Record<ChampErreur, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [rooms, setRooms] = useState<string[]>([])
  const [incidentTypes, setIncidentTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [chargementEchoue, setChargementEchoue] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // La salle du QR code peut changer après le premier rendu (navigation d'une
  // affiche à l'autre). Ajusté pendant le rendu plutôt que dans un effet, pour
  // ne pas afficher brièvement l'ancienne salle.
  const [sallePrecedente, setSallePrecedente] = useState(salleImposee)
  if (salleImposee !== sallePrecedente) {
    setSallePrecedente(salleImposee)
    if (salleImposee) setFormData(current => ({ ...current, room: salleImposee }))
  }

  useEffect(() => {
    const charger = async () => {
      try {
        const [chargees, types] = await Promise.all([
          helpdeskDataService.getRooms(),
          helpdeskDataService.getIncidentTypes(),
        ])
        setRooms(chargees)
        setIncidentTypes(types)
      } catch {
        setChargementEchoue(true)
      } finally {
        setLoading(false)
      }
    }
    void charger()
  }, [])

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type],
    }))
  }

  /** Valide la saisie et renvoie les erreurs par champ. */
  const valider = (data: TicketInput): Partial<Record<ChampErreur, string>> => {
    const trouvees: Partial<Record<ChampErreur, string>> = {}
    if (!data.name.trim()) trouvees.name = 'Indiquez votre nom et prénom.'
    if (!data.email.trim()) trouvees.email = 'Indiquez votre adresse e-mail.'
    else if (!EMAIL_VALIDE.test(data.email.trim())) trouvees.email = 'Cette adresse e-mail n’est pas valide.'
    if (!data.room.trim()) trouvees.room = 'Choisissez la salle concernée.'
    else if (rooms.length > 0 && !rooms.includes(data.room)) trouvees.room = 'Cette salle n’existe pas. Choisissez-en une dans la liste.'
    if (!data.title.trim()) trouvees.title = 'Donnez un titre court à l’intervention.'
    if (!data.comment.trim()) trouvees.comment = 'Décrivez le problème constaté.'
    return trouvees
  }

  const handleSubmit = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()

    const trouvees = valider(formData)
    setErreurs(trouvees)

    if (Object.keys(trouvees).length > 0) {
      // Le focus part sur le premier champ fautif : sur mobile, l'erreur peut
      // être hors écran et passer totalement inaperçue.
      const premier = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      premier?.focus()
      premier?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData, photo)
      // Réinitialisation seulement en cas de succès : après un échec réseau, la
      // saisie doit être conservée, sinon tout est à retaper.
      setFormData({ ...FORMULAIRE_VIDE, room: salleImposee ?? '' })
      setPhoto(null)
      setErreurs({})
    } catch {
      // Le message d'erreur est affiché par l'appelant (notification).
    } finally {
      setSubmitting(false)
    }
  }

  const messageErreur = (champ: ChampErreur) =>
    erreurs[champ]
      ? <p id={`erreur-${champ}`} role="alert" className="mt-1 text-sm text-red-700 font-medium">{erreurs[champ]}</p>
      : null

  return (
    <div className="max-w-3xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden mt-4 mb-12">
      <div className="bg-cesi-jaune border-b-4 border-black p-6">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          {isAdminContext ? 'Saisie administrateur' : 'Déclarer un incident'}
        </h1>
        <p className="font-medium mt-2">Aidez-nous à maintenir le campus en parfait état.</p>
      </div>

      {chargementEchoue && (
        <p role="alert" className="m-6 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm p-3 rounded">
          La liste des salles et des types d'incident n'a pas pu être chargée.
          Vérifiez votre connexion, puis rechargez la page.
        </p>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8" noValidate>
        <section className="space-y-4">
          <h2 className="text-lg font-bold border-b-2 border-gray-200 pb-2">1. Vos informations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nom" className="block text-sm font-bold mb-1">Nom &amp; Prénom *</label>
              <input
                id="nom"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(erreurs.name)}
                aria-describedby={erreurs.name ? 'erreur-name' : undefined}
                className={classesChamp(Boolean(erreurs.name))}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              {messageErreur('name')}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-1">Email *</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={Boolean(erreurs.email)}
                aria-describedby={erreurs.email ? 'erreur-email' : undefined}
                className={classesChamp(Boolean(erreurs.email))}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              {messageErreur('email')}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold border-b-2 border-gray-200 pb-2">2. Localisation de l'incident</h2>

          {salleImposee ? (
            // Salle issue d'un QR code : confirmée visuellement, mais toujours
            // corrigeable — une affiche peut avoir été déplacée ou décollée.
            <div className="bg-cesi-jaune/30 border-2 border-black rounded p-4">
              <p className="text-sm font-bold text-gray-700">Salle détectée par le QR code</p>
              <p className="text-2xl font-black tracking-tight">{salleImposee}</p>
              <a href="/signaler" className="text-sm underline hover:no-underline mt-1 inline-block">
                Ce n'est pas la bonne salle ?
              </a>
              {/* Une affiche peut survivre à la désactivation de sa salle :
                  l'erreur doit rester visible, sinon l'envoi échoue en silence. */}
              {messageErreur('room')}
            </div>
          ) : (
            <div>
              <label htmlFor="salle" className="block text-sm font-bold mb-1">Salle concernée *</label>
              <AutocompleteInput
                id="salle"
                value={formData.room}
                onChange={valeur => setFormData({ ...formData, room: valeur })}
                options={rooms}
                placeholder="Rechercher une salle…"
                disabled={loading}
                invalide={Boolean(erreurs.room)}
                descriptionId={erreurs.room ? 'erreur-room' : undefined}
              />
              {messageErreur('room')}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold border-b-2 border-gray-200 pb-2">3. Nature de l'intervention</h2>

          <fieldset>
            <legend className="block text-sm font-bold mb-2">Type d'incident (plusieurs choix possibles)</legend>
            {loading ? (
              <p className="text-gray-500">Chargement des types d'incident…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {incidentTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 p-3 min-h-11 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-black rounded"
                      checked={formData.types.includes(type)}
                      onChange={() => handleTypeChange(type)}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="titre" className="block text-sm font-bold mb-1">Titre de l'intervention *</label>
            <input
              id="titre"
              type="text"
              placeholder="Ex : Vidéoprojecteur hors service"
              aria-invalid={Boolean(erreurs.title)}
              aria-describedby={erreurs.title ? 'erreur-title' : undefined}
              className={classesChamp(Boolean(erreurs.title))}
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
            {messageErreur('title')}
          </div>

          <div>
            <label htmlFor="commentaires" className="block text-sm font-bold mb-1">Commentaires (détails) *</label>
            <textarea
              id="commentaires"
              rows={4}
              aria-invalid={Boolean(erreurs.comment)}
              aria-describedby={erreurs.comment ? 'erreur-comment' : undefined}
              className={classesChamp(Boolean(erreurs.comment))}
              value={formData.comment}
              onChange={e => setFormData({ ...formData, comment: e.target.value })}
            />
            {messageErreur('comment')}
          </div>

          <PhotoUpload valeur={photo} onChange={setPhoto} />
        </section>

        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 accent-red-600 rounded"
              checked={formData.risk}
              onChange={e => setFormData({ ...formData, risk: e.target.checked })}
            />
            <span className="ml-3">
              <span className="block text-red-800 font-bold">Risque d'accident ou de blessure</span>
              <span className="block text-sm text-red-700 mt-1">
                Cochez cette case si la situation présente un danger pour les étudiants ou le
                personnel : une alerte est envoyée immédiatement aux responsables du site.
                En cas d'urgence vitale, appelez les secours plutôt que d'utiliser ce formulaire.
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white text-lg font-bold py-4 rounded hover:bg-gray-800 transition-colors shadow-lg active:translate-y-1 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {submitting ? 'ENVOI…' : 'SOUMETTRE LA DEMANDE'}
        </button>
      </form>
    </div>
  )
}
