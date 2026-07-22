import { useEffect, useState } from 'react'
import { AdminList } from './components/admin/AdminList/AdminList'
import { AdminStats } from './components/admin/AdminStats/AdminStats'
import { UserForm } from './components/forms/UserForm/UserForm'
import { AppFooter } from './components/layout/AppFooter/AppFooter'
import { AppHeader } from './components/layout/AppHeader/AppHeader'
import { AdminToolbar } from './components/layout/AdminToolbar/AdminToolbar'
import { Toast } from './components/ui/Toast/Toast'
import { ticketService } from './services/tickets'
import type { FormData, Ticket, TicketField, ToastState, View } from './types/helpdesk'

function App() {
  const [currentView, setCurrentView] = useState<View>('USER_FORM')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    ticketService.list()
      .then(setTickets)
      .catch((error: unknown) => setToast({ type: 'danger', message: error instanceof Error ? error.message : 'Erreur de connexion.' }))
  }, [])

  const handleTicketSubmit = async (data: FormData) => {
    try {
      const newTicket = await ticketService.create(data)
      setTickets(current => [newTicket, ...current])
      setToast(data.risk
        ? { type: 'danger', message: "URGENCE : Un email a été envoyé aux responsables de site." }
        : { type: 'success', message: "Votre demande a bien été prise en compte." })
      if (currentView === 'ADMIN_FORM') setCurrentView('ADMIN_LIST')
    } catch (error) {
      setToast({ type: 'danger', message: error instanceof Error ? error.message : 'Erreur lors de la création.' })
      throw error
    }
  }

  const handleUpdateTicket = async (id: string, field: TicketField, value: string) => {
    try {
      await ticketService.update(id, field, value)
      setTickets(current => current.map(t => t.id === id ? { ...t, [field]: value } : t))
    } catch (error) {
      setToast({ type: 'danger', message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour.' })
    }
  }

  const simulateWeeklyEmail = () => {
    const news = tickets.filter(t => t.status === 'NOUVEAU').length
    setToast({ type: 'success', message: `Simulation : Email envoyé au service ! (${news} nvx tickets)` })
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1A1A1A] font-sans selection:bg-[#FBE800] selection:text-black">
      <AppHeader currentView={currentView} setCurrentView={setCurrentView} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentView.startsWith('ADMIN') && (
          <AdminToolbar setCurrentView={setCurrentView} simulateWeeklyEmail={simulateWeeklyEmail} />
        )}

        {currentView === 'USER_FORM' && <UserForm onSubmit={handleTicketSubmit} isAdminContext={false} />}
        {currentView === 'ADMIN_FORM' && <UserForm onSubmit={handleTicketSubmit} isAdminContext={true} />}
        {currentView === 'ADMIN_LIST' && <AdminList tickets={tickets} onUpdateTicket={handleUpdateTicket} />}
        {currentView === 'ADMIN_STATS' && <AdminStats tickets={tickets} />}
      </main>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <AppFooter />
    </div>
  )
}

export default App
