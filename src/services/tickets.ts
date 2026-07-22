import { createClient } from '@supabase/supabase-js'
import type { FormData, Ticket, TicketField } from '../types/helpdesk'

type TicketRow = {
  id: string
  created_at: string
  name: string
  email: string
  room: string
  types: string[]
  title: string
  comment: string
  risk: boolean
  photo: string | null
  status: Ticket['status']
  handler: string
  admin_comment: string
}

const toTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  date: row.created_at.slice(0, 10),
  name: row.name,
  email: row.email,
  room: row.room,
  types: row.types,
  title: row.title,
  comment: row.comment,
  risk: row.risk,
  photo: row.photo,
  status: row.status,
  handler: row.handler,
  adminComment: row.admin_comment,
})

const supabase = import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null

const requireSupabase = () => {
  if (!supabase) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis en développement.')
  return supabase
}

export const ticketService = {
  async list(): Promise<Ticket[]> {
    if (import.meta.env.DEV) {
      const { data, error } = await requireSupabase().from('tickets').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data as TicketRow[]).map(toTicket)
    }

    const response = await fetch('/api/tickets')
    if (!response.ok) throw new Error('Impossible de charger les tickets.')
    return response.json() as Promise<Ticket[]>
  },

  async create(form: FormData): Promise<Ticket> {
    const ticket = { id: `T-${Date.now()}`, ...form, status: 'NOUVEAU', handler: '', admin_comment: '' }
    if (import.meta.env.DEV) {
      const { data, error } = await requireSupabase().from('tickets').insert(ticket).select().single()
      if (error) throw error
      return toTicket(data as TicketRow)
    }

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) throw new Error('Impossible de créer le ticket.')
    return response.json() as Promise<Ticket>
  },

  async update(id: string, field: TicketField, value: string): Promise<void> {
    const column = field === 'adminComment' ? 'admin_comment' : field
    if (import.meta.env.DEV) {
      const { error } = await requireSupabase().from('tickets').update({ [column]: value }).eq('id', id)
      if (error) throw error
      return
    }

    const response = await fetch(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    if (!response.ok) throw new Error('Impossible de mettre à jour le ticket.')
  },
}
