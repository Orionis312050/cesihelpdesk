import type { Status } from '../types/helpdesk'

export const COLORS = {
  primary: '#FBE800', // Jaune vif CESI
  dark: '#1A1A1A',
  light: '#FFFFFF',
  gray: '#F3F4F6'
}

export const STATUSES: Record<Status, { label: string, color: string }> = {
  NOUVEAU: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  EN_COURS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-purple-100 text-purple-800' },
  TERMINE: { label: 'Terminé', color: 'bg-green-100 text-green-800' }
}
