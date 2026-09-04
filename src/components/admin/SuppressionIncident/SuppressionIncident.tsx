import { ConfirmDialog } from '../../ui/ConfirmDialog/ConfirmDialog'
import type { Ticket } from '../../../types/helpdesk'

const dateCourte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

interface SuppressionIncidentProps {
  /** Incident visé, `null` quand aucune suppression n'est demandée. */
  ticket: Ticket | null
  /** `true` pendant la requête : les boutons se bloquent. */
  occupe: boolean
  onConfirmer: () => void
  onAnnuler: () => void
}

/**
 * Confirmation de la suppression d'un incident.
 *
 * Rappelle **ce qui va disparaître** — titre, salle, déclarant, photo — au lieu
 * de poser une question abstraite : sur un tableau de plusieurs dizaines de
 * lignes, la seule protection contre la suppression de la mauvaise est de
 * montrer laquelle est visée.
 *
 * Partagé par le tableau de suivi et la fiche, pour que l'avertissement soit
 * rigoureusement le même d'un écran à l'autre.
 */
export const SuppressionIncident = ({ ticket, occupe, onConfirmer, onAnnuler }: SuppressionIncidentProps) => {
  if (!ticket) return null

  return (
    <ConfirmDialog
      ouvert
      titre={`Supprimer l'incident n° ${ticket.id} ?`}
      libelleConfirmer="Supprimer définitivement"
      occupe={occupe}
      onConfirmer={onConfirmer}
      onAnnuler={onAnnuler}
    >
      <p>
        <strong>{ticket.title}</strong> — {ticket.room}, déclaré le{' '}
        {dateCourte.format(new Date(ticket.createdAt))} par {ticket.name}.
      </p>
      <p>
        La description, le commentaire de suivi{ticket.photoPath && ' et la photo jointe'} seront
        effacés, et l'incident disparaîtra du suivi, des statistiques et des exports.
      </p>
      <p className="font-bold">Cette action est définitive : rien ne permettra de le rétablir.</p>
    </ConfirmDialog>
  )
}
