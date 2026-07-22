import type { Dispatch, SetStateAction } from 'react'
import type { View } from '../../../types/helpdesk'
import { Icons } from '../../ui/Icons/Icons'

interface AdminToolbarProps {
  setCurrentView: Dispatch<SetStateAction<View>>
  simulateWeeklyEmail: () => void
}

export const AdminToolbar = ({ setCurrentView, simulateWeeklyEmail }: AdminToolbarProps) => (
  <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm mb-6 border-l-4 border-[#FBE800]">
    <span className="font-bold text-gray-600">Espace Administration</span>
    <div className="flex gap-2">
      <button onClick={() => setCurrentView('ADMIN_FORM')} className="flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors">
        <Icons.Plus /> Nouveau Ticket
      </button>
      <button onClick={simulateWeeklyEmail} className="text-sm bg-gray-100 hover:bg-gray-200 text-black px-3 py-1.5 rounded transition-colors font-medium border">
        Simuler Email Hebdo
      </button>
    </div>
  </div>
)
