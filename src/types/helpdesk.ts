export type Status = 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE'
export type View = 'USER_FORM' | 'ADMIN_FORM' | 'ADMIN_LIST' | 'ADMIN_STATS'
export type TicketField = 'status' | 'handler' | 'adminComment'

export interface FormData {
  name: string
  email: string
  room: string
  types: string[]
  title: string
  comment: string
  risk: boolean
  photo: string | null
}

export interface Ticket extends FormData {
  id: string
  date: string
  status: Status
  handler: string
  adminComment: string
}

export interface ToastState {
  type: 'danger' | 'success'
  message: string
}
