import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { Icons } from '../../components/ui/Icons/Icons'
import { useTickets } from '../../hooks/useTickets'
import { useToast } from '../../hooks/useToast'
import { salleService } from '../../services/salles'
import type { Salle, SalleInput } from '../../types/helpdesk'
import { normaliser } from '../../utils/ticketFilters'

const SAISIE_VIDE: SalleInput = { nom: '', batiment: '' }

const classesChamp = (enErreur = false) =>
  `w-full border-2 rounded p-2 min-h-11 outline-none transition-colors ${
    enErreur ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-black'
  }`
const classesBoutonPrincipal = 'flex items-center justify-center gap-2 bg-black text-white px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors'
const classesBoutonSecondaire = 'flex items-center gap-2 border-2 border-black px-3 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors'

/** Salle en cours de modification, avec la saisie en cours. */
type Edition = { id: number } & SalleInput

const Etat = ({ actif }: { actif: boolean }) => actif
  ? <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">Active</span>
  : <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-700 border border-gray-300">Désactivée</span>

/** Ligne du tableau en mode modification : les deux champs deviennent saisissables. */
const LigneEdition = ({ salle, edition, erreur, occupe, onChange, onEnregistrer, onAnnuler }: {
  salle: Salle
  edition: Edition
  erreur: string | null
  occupe: boolean
  onChange: (edition: Edition) => void
  onEnregistrer: () => void
  onAnnuler: () => void
}) => {
  // Pas de <form> possible dans une ligne de tableau : Entrée et Échap sont
  // gérés à la main pour retrouver le comportement attendu d'un formulaire.
  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === 'Enter') { evenement.preventDefault(); onEnregistrer() }
    if (evenement.key === 'Escape') onAnnuler()
  }

  return (
    <tr className="border-b bg-cesi-jaune/10 align-top">
      <td className="p-2">
        <label htmlFor={`edition-nom-${salle.id}`} className="sr-only">Nouveau nom de la salle {salle.nom}</label>
        <input
          id={`edition-nom-${salle.id}`}
          type="text"
          autoFocus
          value={edition.nom}
          onChange={e => onChange({ ...edition, nom: e.target.value })}
          onKeyDown={surTouche}
          aria-invalid={Boolean(erreur)}
          aria-describedby={erreur ? `erreur-edition-${salle.id}` : undefined}
          className={classesChamp(Boolean(erreur))}
        />
        {erreur && (
          <p id={`erreur-edition-${salle.id}`} role="alert" className="mt-1 text-sm text-red-700 font-medium">{erreur}</p>
        )}
      </td>
      <td className="p-2">
        <label htmlFor={`edition-batiment-${salle.id}`} className="sr-only">Bâtiment de la salle {salle.nom}</label>
        <input
          id={`edition-batiment-${salle.id}`}
          type="text"
          value={edition.batiment}
          onChange={e => onChange({ ...edition, batiment: e.target.value })}
          onKeyDown={surTouche}
          placeholder="Facultatif"
          className={classesChamp()}
        />
      </td>
      <td className="p-2 pt-4"><Etat actif={salle.actif} /></td>
      <td className="p-2">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onEnregistrer} disabled={occupe} className={classesBoutonPrincipal}>
            <Icons.Check /> {occupe ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onAnnuler} disabled={occupe} className={classesBoutonSecondaire}>
            Annuler
          </button>
        </div>
      </td>
    </tr>
  )
}

/**
 * Gestion des salles proposées dans le formulaire de déclaration.
 *
 * Trois opérations : ajouter, renommer (ou changer de bâtiment), activer ou
 * désactiver. Pas de suppression : une salle porte un historique d'incidents,
 * et la base la refuserait de toute façon (`on delete restrict`).
 *
 * Ces opérations se faisaient jusqu'ici en SQL dans le tableau de bord Supabase
 * (docs/04-exploitation.md) — hors de portée d'un administrateur qui n'a que
 * l'application sous la main.
 */
export const SallesPage = () => {
  const toast = useToast()
  const { recharger: rechargerTickets } = useTickets()
  const [salles, setSalles] = useState<Salle[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [nouvelle, setNouvelle] = useState<SalleInput>(SAISIE_VIDE)
  const [erreurNouvelle, setErreurNouvelle] = useState<string | null>(null)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [erreurEdition, setErreurEdition] = useState<string | null>(null)
  /** Salle en cours d'écriture (`'creation'` pour l'ajout) : bloque les autres actions pendant ce temps. */
  const [occupe, setOccupe] = useState<number | 'creation' | null>(null)

  const charger = useCallback(
    () => salleService.listerToutes()
      .then(setSalles)
      .catch((cause: unknown) => toast.erreurDe(cause, 'Impossible de charger la liste des salles.'))
      .finally(() => setChargement(false)),
    [toast],
  )

  useEffect(() => { void charger() }, [charger])

  const resultats = useMemo(() => {
    const critere = normaliser(recherche)
    if (!critere) return salles
    return salles.filter(s => normaliser(s.nom).includes(critere) || normaliser(s.batiment).includes(critere))
  }, [salles, recherche])

  const nbInactives = salles.filter(s => !s.actif).length

  const ajouter = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (!nouvelle.nom.trim()) {
      setErreurNouvelle('Indiquez le nom de la salle.')
      return
    }
    setErreurNouvelle(null)
    setOccupe('creation')
    try {
      const creee = await salleService.creer(nouvelle)
      toast.succes(`Salle « ${creee.nom} » ajoutée.`)
      setNouvelle(SAISIE_VIDE)
      await charger()
    } catch (cause) {
      // Le cas courant est un nom déjà pris : le message doit rester sous le
      // champ, pas partir dans une notification qui disparaît.
      setErreurNouvelle(cause instanceof Error ? cause.message : "Impossible d'ajouter la salle.")
    } finally {
      setOccupe(null)
    }
  }

  const commencerEdition = (salle: Salle) => {
    setEdition({ id: salle.id, nom: salle.nom, batiment: salle.batiment })
    setErreurEdition(null)
  }

  const annulerEdition = () => {
    setEdition(null)
    setErreurEdition(null)
  }

  const enregistrerEdition = async () => {
    if (!edition) return
    const nom = edition.nom.trim()
    const batiment = edition.batiment.trim()
    if (!nom) {
      setErreurEdition('Le nom ne peut pas être vide.')
      return
    }
    const initiale = salles.find(s => s.id === edition.id)
    if (initiale && initiale.nom === nom && initiale.batiment === batiment) {
      annulerEdition()
      return
    }
    setOccupe(edition.id)
    try {
      await salleService.modifier(edition.id, { nom, batiment })
      toast.succes(`Salle « ${nom} » modifiée.`)
      annulerEdition()
      await charger()
      // Le tableau de suivi affiche le nom de la salle depuis sa copie en
      // mémoire : elle doit suivre le renommage.
      if (initiale && initiale.nom !== nom) void rechargerTickets()
    } catch (cause) {
      setErreurEdition(cause instanceof Error ? cause.message : 'Impossible de modifier la salle.')
    } finally {
      setOccupe(null)
    }
  }

  const basculerActif = async (salle: Salle) => {
    setOccupe(salle.id)
    try {
      await salleService.definirActif(salle.id, !salle.actif)
      toast.succes(salle.actif
        ? `Salle « ${salle.nom} » désactivée : elle n'est plus proposée dans le formulaire.`
        : `Salle « ${salle.nom} » réactivée.`)
      await charger()
    } catch (cause) {
      toast.erreurDe(cause, "Impossible de changer l'état de la salle.")
    } finally {
      setOccupe(null)
    }
  }

  const actionsBloquees = occupe !== null || edition !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Salles</h1>
        <p className="text-sm text-gray-600 mt-1">
          Lieux proposés dans le formulaire de déclaration —{' '}
          {chargement
            ? 'chargement…'
            : `${salles.length} salle(s) enregistrée(s)${nbInactives > 0 ? `, dont ${nbInactives} désactivée(s)` : ''}.`}
        </p>
      </div>

      <section
        aria-labelledby="ajout-titre"
        className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6"
      >
        <h2 id="ajout-titre" className="text-lg font-black uppercase tracking-tight mb-3">Ajouter une salle</h2>
        <form onSubmit={ajouter} noValidate className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start">
          <div>
            <label htmlFor="nouvelle-nom" className="block text-sm font-bold mb-1">Nom *</label>
            <input
              id="nouvelle-nom"
              type="text"
              placeholder="Ex : B305"
              value={nouvelle.nom}
              onChange={e => setNouvelle({ ...nouvelle, nom: e.target.value })}
              aria-invalid={Boolean(erreurNouvelle)}
              aria-describedby={erreurNouvelle ? 'erreur-nouvelle' : undefined}
              className={classesChamp(Boolean(erreurNouvelle))}
            />
            {erreurNouvelle && (
              <p id="erreur-nouvelle" role="alert" className="mt-1 text-sm text-red-700 font-medium">{erreurNouvelle}</p>
            )}
          </div>
          <div>
            <label htmlFor="nouvelle-batiment" className="block text-sm font-bold mb-1">Bâtiment</label>
            <input
              id="nouvelle-batiment"
              type="text"
              placeholder="Ex : Bâtiment B"
              value={nouvelle.batiment}
              onChange={e => setNouvelle({ ...nouvelle, batiment: e.target.value })}
              className={classesChamp()}
            />
          </div>
          <button type="submit" disabled={occupe !== null} className={`${classesBoutonPrincipal} sm:mt-6`}>
            <Icons.Plus /> {occupe === 'creation' ? 'Ajout…' : 'Ajouter'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-3">
          La salle est proposée aussitôt dans le formulaire. Pensez ensuite à imprimer son affiche depuis{' '}
          <Link to="/qr-codes" className="underline hover:no-underline">QR codes</Link>.
        </p>
      </section>

      <section aria-labelledby="liste-titre" className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 id="liste-titre" className="text-lg font-black uppercase tracking-tight">Liste des salles</h2>
          <div className="relative sm:w-72">
            <span className="absolute inset-y-0 left-3 flex items-center" aria-hidden="true"><Icons.Search /></span>
            <input
              type="search"
              aria-label="Rechercher une salle par nom ou bâtiment"
              placeholder="Rechercher…"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="w-full border-2 border-gray-200 rounded pl-9 pr-2 py-2 min-h-11 focus:border-black outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-2xl">
            <caption className="sr-only">Salles du campus, avec leur bâtiment et leur état.</caption>
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th scope="col" className="p-2 font-bold text-sm">Nom</th>
                <th scope="col" className="p-2 font-bold text-sm">Bâtiment</th>
                <th scope="col" className="p-2 font-bold text-sm">État</th>
                <th scope="col" className="p-2 font-bold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resultats.map(salle => (
                edition?.id === salle.id ? (
                  <LigneEdition
                    key={salle.id}
                    salle={salle}
                    edition={edition}
                    erreur={erreurEdition}
                    occupe={occupe === salle.id}
                    onChange={setEdition}
                    onEnregistrer={() => void enregistrerEdition()}
                    onAnnuler={annulerEdition}
                  />
                ) : (
                  <tr
                    key={salle.id}
                    className={`border-b transition-colors ${salle.actif ? 'hover:bg-gray-50' : 'bg-gray-50 text-gray-500'}`}
                  >
                    <td className="p-2 font-bold">{salle.nom}</td>
                    <td className="p-2 text-sm">
                      {salle.batiment || <span className="text-gray-400 italic">Non renseigné</span>}
                    </td>
                    <td className="p-2"><Etat actif={salle.actif} /></td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => commencerEdition(salle)}
                          disabled={actionsBloquees}
                          aria-label={`Renommer la salle ${salle.nom}`}
                          className={classesBoutonSecondaire}
                        >
                          <Icons.Pencil /> Renommer
                        </button>
                        <button
                          type="button"
                          onClick={() => void basculerActif(salle)}
                          disabled={actionsBloquees}
                          aria-label={`${salle.actif ? 'Désactiver' : 'Réactiver'} la salle ${salle.nom}`}
                          className={classesBoutonSecondaire}
                        >
                          {occupe === salle.id ? '…' : salle.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}

              {chargement && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500" role="status" aria-live="polite">
                    Chargement des salles…
                  </td>
                </tr>
              )}

              {!chargement && resultats.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    {salles.length === 0
                      ? 'Aucune salle enregistrée. Ajoutez la première ci-dessus.'
                      : 'Aucune salle ne correspond à la recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-gray-50 border-l-4 border-black text-sm text-gray-700 p-3 rounded space-y-1">
          <p>
            <strong>Aucune suppression possible.</strong> Une salle porte un historique d'incidents :
            désactivez-la pour la retirer du formulaire, ses incidents passés restent consultables.
          </p>
          <p>
            <strong>Après un renommage</strong>, les incidents passés suivent automatiquement, mais une
            affiche déjà imprimée encode l'ancien nom dans son QR code : réimprimez-la.
          </p>
        </div>
      </section>
    </div>
  )
}
