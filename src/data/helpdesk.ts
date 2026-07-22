import type { Status, Ticket } from '../types/helpdesk'

export const COLORS = {
  primary: '#FBE800', // Jaune vif CESI
  dark: '#1A1A1A',
  light: '#FFFFFF',
  gray: '#F3F4F6'
}

export const INCIDENT_TYPES = [
  "Électricité / Éclairage",
  "Plomberie / Fuite",
  "Chauffage / Climatisation",
  "Mobilier endommagé",
  "Serrurerie / Accès",
  "Matériel Informatique (Écran, Câbles)",
  "Nettoyage / Propreté",
  "Autre"
]

export const ROOMS = [
  "Amphi 1", "Amphi 2", "Bâtiment A - Hall", "Cafétéria",
  "FabLab", "Salle 101", "Salle 102", "Salle 201", "Salle 202",
  "Salle 205 (Informatique)", "Salle 301", "Salle Réunion A"
].sort()

export const STATUSES: Record<Status, { label: string, color: string }> = {
  NOUVEAU: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  EN_COURS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-purple-100 text-purple-800' },
  TERMINE: { label: 'Terminé', color: 'bg-green-100 text-green-800' }
}

export const INITIAL_TICKETS: Ticket[] = [
  { id: 'T-1001', date: '2026-06-15', name: 'Dupont Jean', email: 'j.dupont@cesi.fr', room: 'Salle 101', types: ['Électricité / Éclairage'], title: 'Néon clignotant', comment: 'Le néon au fond de la classe clignote et fait du bruit.', risk: false, status: 'NOUVEAU', handler: '', adminComment: '', photo: null },
  { id: 'T-1002', date: '2026-06-12', name: 'Martin Sophie', email: 's.martin@cesi.fr', room: 'Cafétéria', types: ['Plomberie / Fuite'], title: 'Fuite lavabo', comment: "L'eau coule en continu, risque de glissade.", risk: true, status: 'EN_COURS', handler: 'Équipe Tech', adminComment: 'Pièce commandée', photo: null },
  { id: 'T-1003', date: '2026-05-20', name: 'Bernard Luc', email: 'l.bernard@cesi.fr', room: 'FabLab', types: ['Serrurerie / Accès'], title: 'Porte bloquée', comment: "La poignée est cassée de l'intérieur.", risk: true, status: 'TERMINE', handler: 'Serrurier Externe', adminComment: 'Poignée remplacée le 21/05', photo: null },
  { id: 'T-1004', date: '2026-06-18', name: 'Petit Alice', email: 'a.petit@cesi.fr', room: 'Amphi 1', types: ['Chauffage / Climatisation'], title: 'Clim en panne', comment: 'Il fait 30 degrés.', risk: false, status: 'EN_ATTENTE', handler: 'Maintenance', adminComment: 'Intervention prévue semaine pro', photo: null },
]
