import type { Dispatch, SetStateAction } from 'react'
import type { View } from '../../../types/helpdesk'
import { Icons } from '../../ui/Icons/Icons'

interface AppHeaderProps {
  currentView: View
  setCurrentView: Dispatch<SetStateAction<View>>
}

export const AppHeader = ({ currentView, setCurrentView }: AppHeaderProps) => (
  <header className="bg-black text-white sticky top-0 z-40 shadow-md">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="bg-[#FBE800] text-black font-black text-xl px-3 py-1 -skew-x-12 inline-block">CESI</div>
        <span className="font-bold hidden sm:inline tracking-wide">HELP DESK</span>
      </div>

      <nav className="flex items-center gap-1 sm:gap-4">
        <button
          onClick={() => setCurrentView('USER_FORM')}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${currentView === 'USER_FORM' ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
        >
          <Icons.Home /> <span className="hidden sm:inline">Portail Utilisateur</span>
        </button>
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        <button
          onClick={() => setCurrentView('ADMIN_LIST')}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${currentView === 'ADMIN_LIST' ? 'bg-white/20 font-bold' : 'hover:bg-white/10 text-gray-300'}`}
          title="Suivi des incidents"
        >
          <Icons.List /> <span className="hidden sm:inline">Suivi</span>
        </button>
        <button
          onClick={() => setCurrentView('ADMIN_STATS')}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${currentView === 'ADMIN_STATS' ? 'bg-white/20 font-bold' : 'hover:bg-white/10 text-gray-300'}`}
          title="Statistiques"
        >
          <Icons.Chart /> <span className="hidden sm:inline">Stats</span>
        </button>
      </nav>
    </div>
  </header>
)
