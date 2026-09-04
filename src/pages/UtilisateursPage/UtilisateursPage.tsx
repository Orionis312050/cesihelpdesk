import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Icons } from '../../components/ui/Icons/Icons'
import { useAuth } from '../../hooks/useAuth'
import { useTickets } from '../../hooks/useTickets'
import { useToast } from '../../hooks/useToast'
import { utilisateurService } from '../../services/utilisateurs'
import type { Profil, Role } from '../../types/auth'
import { normaliser } from '../../utils/ticketFilters'

const classesChamp = (enErreur = false) =>
  `w-full border-2 rounded p-2 min-h-11 outline-none transition-colors ${
    enErreur ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-black'
  }`
const classesBoutonPrincipal = 'flex items-center justify-center gap-2 bg-black text-white px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors'
const classesBoutonSecondaire = 'flex items-center gap-2 border-2 border-black px-3 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors'
const classesSelect = 'border-2 border-gray-200 rounded px-2 py-2 min-h-11 text-sm font-bold bg-white focus:border-black outline-none disabled:opacity-50 disabled:bg-gray-100 transition-colors'

/** Compte en cours de renommage, avec la saisie en cours. */
type Edition = { id: string; nomComplet: string }

const Etat = ({ actif }: { actif: boolean }) => actif
  ? <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">Actif</span>
  : <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-700 border border-gray-300">Désactivé</span>

const EtiquetteRole = ({ role }: { role: Role }) => role === 'admin'
  ? <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-cesi-jaune text-black border border-black">Administrateur</span>
  : <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-300">Technicien</span>

/** Ligne du tableau en mode renommage : seul le nom devient saisissable. */
const LigneEdition = ({ compte, edition, erreur, occupe, onChange, onEnregistrer, onAnnuler }: {
  compte: Profil
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
        <label htmlFor={`edition-nom-${compte.id}`} className="sr-only">
          Nouveau nom affiché de {compte.nomComplet}
        </label>
        <input
          id={`edition-nom-${compte.id}`}
          type="text"
          autoFocus
          value={edition.nomComplet}
          onChange={e => onChange({ ...edition, nomComplet: e.target.value })}
          onKeyDown={surTouche}
          aria-invalid={Boolean(erreur)}
          aria-describedby={erreur ? `erreur-edition-${compte.id}` : undefined}
          className={classesChamp(Boolean(erreur))}
        />
        {erreur && (
          <p id={`erreur-edition-${compte.id}`} role="alert" className="mt-1 text-sm text-red-700 font-medium">{erreur}</p>
        )}
      </td>
      <td className="p-2 pt-4 text-sm text-gray-600 break-all">{compte.email}</td>
      <td className="p-2 pt-4"><EtiquetteRole role={compte.role} /></td>
      <td className="p-2 pt-4"><Etat actif={compte.actif} /></td>
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
 * Gestion des comptes du personnel.
 *
 * Trois opérations : changer le rôle, activer ou désactiver, corriger le nom
 * affiché. Ni création ni suppression — l'identité vit dans `auth.users`, que le
 * navigateur ne peut pas administrer (l'inscription publique est fermée en
 * production), et un compte porte l'historique des incidents qu'il a traités.
 *
 * Ces opérations se faisaient jusqu'ici en SQL (docs/04-exploitation.md) — hors
 * de portée d'un administrateur qui n'a que l'application sous la main.
 */
export const UtilisateursPage = () => {
  const toast = useToast()
  const { profil } = useAuth()
  const { recharger: rechargerTickets } = useTickets()
  const [comptes, setComptes] = useState<Profil[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [edition, setEdition] = useState<Edition | null>(null)
  const [erreurEdition, setErreurEdition] = useState<string | null>(null)
  /** Compte en cours d'écriture : bloque les autres actions pendant ce temps. */
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(
    () => utilisateurService.listerTous()
      .then(setComptes)
      .catch((cause: unknown) => toast.erreurDe(cause, 'Impossible de charger la liste des comptes.'))
      .finally(() => setChargement(false)),
    [toast],
  )

  useEffect(() => { void charger() }, [charger])

  const resultats = useMemo(() => {
    const critere = normaliser(recherche)
    if (!critere) return comptes
    return comptes.filter(c => normaliser(c.nomComplet).includes(critere) || normaliser(c.email).includes(critere))
  }, [comptes, recherche])

  const nbAdmins = comptes.filter(c => c.role === 'admin' && c.actif).length
  const nbInactifs = comptes.filter(c => !c.actif).length

  const commencerEdition = (compte: Profil) => {
    setEdition({ id: compte.id, nomComplet: compte.nomComplet })
    setErreurEdition(null)
  }

  const annulerEdition = () => {
    setEdition(null)
    setErreurEdition(null)
  }

  const enregistrerEdition = async () => {
    if (!edition) return
    const nomComplet = edition.nomComplet.trim()
    if (!nomComplet) {
      setErreurEdition('Le nom ne peut pas être vide.')
      return
    }
    const initial = comptes.find(c => c.id === edition.id)
    if (initial && initial.nomComplet === nomComplet) {
      annulerEdition()
      return
    }
    setOccupe(edition.id)
    try {
      await utilisateurService.renommer(edition.id, nomComplet)
      toast.succes(`Compte renommé en « ${nomComplet} ».`)
      annulerEdition()
      await charger()
      // Le tableau de suivi affiche le nom du traitant depuis sa copie en
      // mémoire : elle doit suivre le renommage.
      void rechargerTickets()
    } catch (cause) {
      // Le message reste sous le champ plutôt que dans une notification qui
      // disparaît : la saisie fautive est encore à l'écran.
      setErreurEdition(cause instanceof Error ? cause.message : 'Impossible de renommer le compte.')
    } finally {
      setOccupe(null)
    }
  }

  const changerRole = async (compte: Profil, role: Role) => {
    setOccupe(compte.id)
    try {
      await utilisateurService.definirRole(compte.id, role)
      toast.succes(role === 'admin'
        ? `« ${compte.nomComplet} » est désormais administrateur.`
        : `« ${compte.nomComplet} » est désormais technicien.`)
      await charger()
    } catch (cause) {
      toast.erreurDe(cause, 'Impossible de changer le rôle.')
    } finally {
      setOccupe(null)
    }
  }

  const basculerActif = async (compte: Profil) => {
    setOccupe(compte.id)
    try {
      await utilisateurService.definirActif(compte.id, !compte.actif)
      toast.succes(compte.actif
        ? `Compte « ${compte.nomComplet} » désactivé : il n'a plus accès à l'application.`
        : `Compte « ${compte.nomComplet} » réactivé.`)
      await charger()
      // Un compte désactivé disparaît de la liste « Traitant » d'une fiche.
      void rechargerTickets()
    } catch (cause) {
      toast.erreurDe(cause, "Impossible de changer l'état du compte.")
    } finally {
      setOccupe(null)
    }
  }

  const actionsBloquees = occupe !== null || edition !== null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-gray-600 mt-1">
          Comptes du personnel habilité à traiter les incidents —{' '}
          {chargement
            ? 'chargement…'
            : `${comptes.length} compte(s), dont ${nbAdmins} administrateur(s) actif(s)${nbInactifs > 0 ? ` et ${nbInactifs} compte(s) désactivé(s)` : ''}.`}
        </p>
      </div>

      <section aria-labelledby="liste-titre" className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 id="liste-titre" className="text-lg font-black uppercase tracking-tight">Liste des comptes</h2>
          <div className="relative sm:w-72">
            <span className="absolute inset-y-0 left-3 flex items-center" aria-hidden="true"><Icons.Search /></span>
            <input
              type="search"
              aria-label="Rechercher un compte par nom ou adresse e-mail"
              placeholder="Rechercher…"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="w-full border-2 border-gray-200 rounded pl-9 pr-2 py-2 min-h-11 focus:border-black outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-3xl">
            <caption className="sr-only">Comptes du personnel, avec leur adresse e-mail, leur rôle et leur état.</caption>
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th scope="col" className="p-2 font-bold text-sm">Nom affiché</th>
                <th scope="col" className="p-2 font-bold text-sm">E-mail</th>
                <th scope="col" className="p-2 font-bold text-sm">Rôle</th>
                <th scope="col" className="p-2 font-bold text-sm">État</th>
                <th scope="col" className="p-2 font-bold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resultats.map(compte => {
                // On ne modifie ni son propre rôle ni son propre état : se
                // rétrograder ou se désactiver coupe l'accès à cet écran même.
                // Le verrou réel est en base (trg_proteger_dernier_admin) ;
                // celui-ci évite simplement d'aller s'y heurter.
                const estMoi = profil?.id === compte.id

                return edition?.id === compte.id ? (
                  <LigneEdition
                    key={compte.id}
                    compte={compte}
                    edition={edition}
                    erreur={erreurEdition}
                    occupe={occupe === compte.id}
                    onChange={setEdition}
                    onEnregistrer={() => void enregistrerEdition()}
                    onAnnuler={annulerEdition}
                  />
                ) : (
                  <tr
                    key={compte.id}
                    className={`border-b transition-colors ${compte.actif ? 'hover:bg-gray-50' : 'bg-gray-50 text-gray-500'}`}
                  >
                    <td className="p-2 font-bold">
                      {compte.nomComplet}
                      {estMoi && <span className="ml-2 text-xs font-medium text-gray-500">(vous)</span>}
                    </td>
                    <td className="p-2 text-sm break-all">{compte.email}</td>
                    <td className="p-2">
                      {estMoi ? (
                        <EtiquetteRole role={compte.role} />
                      ) : (
                        <>
                          <label htmlFor={`role-${compte.id}`} className="sr-only">
                            Rôle de {compte.nomComplet}
                          </label>
                          <select
                            id={`role-${compte.id}`}
                            value={compte.role}
                            disabled={actionsBloquees}
                            onChange={e => void changerRole(compte, e.target.value as Role)}
                            className={classesSelect}
                          >
                            <option value="technicien">Technicien</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </>
                      )}
                    </td>
                    <td className="p-2"><Etat actif={compte.actif} /></td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => commencerEdition(compte)}
                          disabled={actionsBloquees}
                          aria-label={`Renommer le compte ${compte.nomComplet}`}
                          className={classesBoutonSecondaire}
                        >
                          <Icons.Pencil /> Renommer
                        </button>
                        <button
                          type="button"
                          onClick={() => void basculerActif(compte)}
                          disabled={actionsBloquees || estMoi}
                          aria-label={`${compte.actif ? 'Désactiver' : 'Réactiver'} le compte ${compte.nomComplet}`}
                          title={estMoi ? 'Vous ne pouvez pas désactiver votre propre compte.' : undefined}
                          className={classesBoutonSecondaire}
                        >
                          {occupe === compte.id ? '…' : compte.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {chargement && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500" role="status" aria-live="polite">
                    Chargement des comptes…
                  </td>
                </tr>
              )}

              {!chargement && resultats.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {comptes.length === 0
                      ? 'Aucun compte enregistré.'
                      : 'Aucun compte ne correspond à la recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-gray-50 border-l-4 border-black text-sm text-gray-700 p-3 rounded space-y-2">
          <p>
            <strong>La création d'un compte se fait sur le serveur</strong>, avec{' '}
            <code>deploy/scripts/creer-compte-admin.sh</code>. L'inscription publique est
            volontairement fermée en production : ouverte, elle permettrait à un inconnu de
            s'enregistrer lui-même comme administrateur.
          </p>
          <p>
            <strong>Aucune suppression possible.</strong> Un compte est référencé par les incidents
            qu'il a traités : désactivez-le pour lui couper l'accès, son nom reste affiché sur les
            fiches passées.
          </p>
          <p>
            <strong>L'adresse e-mail n'est pas modifiable ici :</strong> c'est l'identifiant de
            connexion, détenu par Supabase Auth. La changer dans ce tableau désynchroniserait
            l'annuaire de l'identité réelle.
          </p>
          <p>
            <strong>Un changement de rôle prend effet immédiatement</strong> sur l'accès aux
            données ; la personne concernée doit en revanche recharger la page pour que son menu se
            mette à jour.
          </p>
          <p>
            <strong>Sur votre propre ligne</strong>, le rôle et l'état sont verrouillés. La base
            refuse par ailleurs de retirer le dernier administrateur actif.
          </p>
        </div>
      </section>
    </div>
  )
}
