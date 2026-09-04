import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icons } from '../Icons/Icons'

interface ConfirmDialogProps {
  /** Affiche la fenêtre. Fermée, elle n'occupe aucune place à l'écran. */
  ouvert: boolean
  /** Question posée, courte et sans ambiguïté : « Supprimer l'incident n° 12 ? » */
  titre: string
  /** Ce que l'action va détruire, détaillé dans le corps de la fenêtre. */
  children: ReactNode
  /** Libellé du bouton rouge, à l'infinitif : « Supprimer définitivement ». */
  libelleConfirmer: string
  /** `true` pendant l'exécution : les deux boutons se bloquent, Échap ne ferme plus. */
  occupe?: boolean
  onConfirmer: () => void
  onAnnuler: () => void
}

/**
 * Demande confirmation avant une action irréversible.
 *
 * Repose sur l'élément natif `<dialog>` et sur `showModal()` : le navigateur
 * fournit lui-même le piège de focus, la fermeture par Échap et l'inertie du
 * reste de la page. Une modale réécrite en `<div>` aurait demandé de refaire
 * tout cela à la main — c'est précisément ce qui avait fait abandonner la
 * modale de fiche au profit d'une page routée (ADR-006).
 *
 * Le fond n'est pas cliquable pour fermer : sur une action destructrice, un
 * clic à côté ne doit pas ressembler à une réponse.
 *
 * @example
 * <ConfirmDialog
 *   ouvert={aConfirmer !== null}
 *   titre="Supprimer l'incident n° 12 ?"
 *   libelleConfirmer="Supprimer définitivement"
 *   onConfirmer={() => void supprimer()}
 *   onAnnuler={() => setAConfirmer(null)}
 * >
 *   <p>Cette action est définitive.</p>
 * </ConfirmDialog>
 */
export const ConfirmDialog = ({
  ouvert, titre, children, libelleConfirmer, occupe = false, onConfirmer, onAnnuler,
}: ConfirmDialogProps) => {
  const dialogue = useRef<HTMLDialogElement>(null)
  const boutonAnnuler = useRef<HTMLButtonElement>(null)
  const declencheur = useRef<HTMLElement | null>(null)
  const idTitre = useId()

  useEffect(() => {
    const element = dialogue.current
    if (!element) return

    if (ouvert && !element.open) {
      declencheur.current = document.activeElement as HTMLElement | null
      element.showModal()
      // Le focus va sur « Annuler » : sur une fenêtre de confirmation, la
      // touche Entrée réflexe ne doit pas déclencher la suppression.
      boutonAnnuler.current?.focus()
    }
    if (!ouvert && element.open) element.close()
  }, [ouvert])

  // Le navigateur rend le focus au bouton d'origine quand la fenêtre est
  // fermée par `close()` — pas quand elle est simplement retirée du DOM. On
  // s'en charge, sauf si ce bouton a disparu entre-temps (ligne supprimée).
  useEffect(() => () => {
    if (declencheur.current?.isConnected) declencheur.current.focus()
  }, [])

  return (
    <dialog
      ref={dialogue}
      aria-labelledby={idTitre}
      // Échap déclenche `cancel` : on laisse l'état du parent commander la
      // fermeture, pour qu'il n'y ait jamais qu'une seule source de vérité.
      onCancel={evenement => { evenement.preventDefault(); if (!occupe) onAnnuler() }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg p-0 bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] backdrop:bg-black/60"
    >
      <h2 id={idTitre} className="flex items-center gap-2 bg-red-700 text-white border-b-4 border-black p-4 font-black uppercase tracking-tight">
        <Icons.Alert /> {titre}
      </h2>

      <div className="p-4 space-y-3 text-sm">{children}</div>

      <div className="flex flex-wrap justify-end gap-2 p-4 pt-0">
        <button
          type="button"
          ref={boutonAnnuler}
          onClick={onAnnuler}
          disabled={occupe}
          className="flex items-center gap-2 border-2 border-black px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirmer}
          disabled={occupe}
          className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-red-800 disabled:opacity-50 transition-colors"
        >
          <Icons.Trash /> {occupe ? 'Suppression…' : libelleConfirmer}
        </button>
      </div>
    </dialog>
  )
}
