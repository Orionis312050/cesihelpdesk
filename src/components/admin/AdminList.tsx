import { useMemo, useState } from 'react'
import { STATUSES } from '../../data/helpdesk'
import type { Status, Ticket, TicketField } from '../../types/helpdesk'
import { Icons } from '../ui/Icons'
import { TicketModal } from './TicketModal'

interface AdminListProps {
  tickets: Ticket[]
  onUpdateTicket: (id: string, field: TicketField, value: string) => void | Promise<void>
}

export const AdminList = ({ tickets, onUpdateTicket }: AdminListProps) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | Status>('ALL')
  const [filterSearch, setFilterSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [sortDate, setSortDate] = useState<'desc' | 'asc'>('desc')

  const filteredTickets = useMemo(() => {
    let filtered = tickets.filter(t => {
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus
      const matchSearch = t.title.toLowerCase().includes(filterSearch.toLowerCase()) || t.room.toLowerCase().includes(filterSearch.toLowerCase())
      return matchStatus && matchSearch
    })
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortDate === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return filtered
  }, [tickets, filterStatus, filterSearch, sortDate])

  const exportToCSV = () => {
    const headers = ['Date', 'Demandeur', 'Salle', 'Titre', 'Statut', 'Traitant', 'Risque']
    const csvContent = [
      headers.join(';'),
      ...filteredTickets.map(t =>
        [t.date, t.name, t.room, `"${t.title}"`, t.status, t.handler || 'Non assigné', t.risk ? 'OUI' : 'NON'].join(';')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `CESI_Interventions_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-black">Suivi des Incidents</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" placeholder="Rechercher (Titre, Salle)..." className="border p-2 rounded text-sm outline-none focus:border-black" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          <select className="border p-2 rounded text-sm bg-white outline-none focus:border-black" value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'ALL' | Status)}>
            <option value="ALL">Tous les statuts</option>
            {Object.entries(STATUSES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors">
            <Icons.Download /> Exporter Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="p-3 font-bold text-sm cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSortDate(sortDate === 'desc' ? 'asc' : 'desc')}>
                <div className="flex items-center gap-2">
                  Date
                  <span className="text-xs">{sortDate === 'desc' ? '↓' : '↑'}</span>
                </div>
              </th>
              <th className="p-3 font-bold text-sm">Titre</th>
              <th className="p-3 font-bold text-sm">Lieu</th>
              <th className="p-3 font-bold text-sm">Statut</th>
              <th className="p-3 font-bold text-sm">Traitant</th>
              <th className="p-3 font-bold text-sm text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <tr key={ticket.id} className={`border-b hover:bg-gray-50 transition-colors ${ticket.risk ? 'bg-red-100/50' : ''}`}>
                <td className="p-3">
                  <div className="text-sm">{ticket.date}</div>
                </td>
                <td className="p-3">
                  <div className="font-bold flex items-center gap-2">
                    {ticket.title}
                    {ticket.risk && <span className="text-red-600"><Icons.Alert /></span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm text-gray-600">{ticket.room}</div>
                </td>
                <td className="p-3">
                  <select
                    className={`text-xs font-bold px-2 py-1 rounded-full outline-none border cursor-pointer ${STATUSES[ticket.status].color}`}
                    value={ticket.status}
                    onChange={(e) => onUpdateTicket(ticket.id, 'status', e.target.value)}
                  >
                    {Object.entries(STATUSES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    placeholder="Non assigné"
                    className="text-sm border p-1 rounded w-32 outline-none focus:border-black"
                    defaultValue={ticket.handler || ''}
                    onBlur={(e) => onUpdateTicket(ticket.id, 'handler', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => setSelectedTicket(ticket)} className="text-gray-500 hover:text-black transition-colors" title="Fiche complète">
                    <Icons.Eye />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Aucun ticket trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdateTicket={onUpdateTicket} />
      )}
    </div>
  )
}
