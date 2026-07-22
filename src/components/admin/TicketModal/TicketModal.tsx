import type { Ticket, TicketField } from '../../../types/helpdesk'
import { Icons } from '../../ui/Icons/Icons'

interface TicketModalProps {
  ticket: Ticket
  onClose: () => void
  onUpdateTicket: (id: string, field: TicketField, value: string) => void
}

export const TicketModal = ({ ticket, onClose, onUpdateTicket }: TicketModalProps) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center p-6 border-b-2 border-black bg-[#FBE800]">
        <h3 className="text-xl font-black">Fiche Incident : {ticket.id}</h3>
        <button onClick={onClose} className="font-bold text-xl">&times;</button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-bold block text-gray-500">Demandeur</span> {ticket.name} ({ticket.email})</div>
          <div><span className="font-bold block text-gray-500">Date de déclaration</span> {ticket.date}</div>
          <div><span className="font-bold block text-gray-500">Localisation</span> {ticket.room}</div>
          <div><span className="font-bold block text-gray-500">Types</span> {ticket.types.join(', ')}</div>
        </div>

        <div className="border-t pt-4">
          <span className="font-bold block text-gray-500 mb-1">Titre de l'intervention</span>
          <div className="text-lg font-bold">{ticket.title}</div>
        </div>

        <div>
          <span className="font-bold block text-gray-500 mb-1">Description</span>
          <div className="bg-gray-50 p-3 rounded border text-sm">{ticket.comment}</div>
        </div>

        {ticket.risk && (
          <div className="bg-red-100 text-red-800 p-2 rounded text-sm font-bold flex items-center gap-2">
            <Icons.Alert /> Risque d'accident ou de blessure signalé !
          </div>
        )}

        <div className="border-t pt-4">
          <label className="font-bold block text-gray-500 mb-1">Commentaire Admin (Résolution / Suivi)</label>
          <textarea
            className="w-full border p-2 rounded text-sm outline-none focus:border-black"
            rows={3}
            defaultValue={ticket.adminComment}
            onBlur={(e) => onUpdateTicket(ticket.id, 'adminComment', e.target.value)}
            placeholder="Notez ici les étapes de résolution..."
          ></textarea>
        </div>
      </div>
    </div>
  </div>
)
