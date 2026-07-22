import { createClient } from '@supabase/supabase-js'
import type { FormData, Status, Ticket, TicketField } from '../types/helpdesk'

type TicketRow = {
  id: number
  demandeur_nom: string
  demandeur_email: string
  salle_id: number
  titre: string
  description: string
  image_url: string | null
  risque_accident: boolean
  statut: string
  assigne_a_id: number | null
  commentaire_admin: string | null
  created_at: string
}

type NamedRow = { id: number; nom: string }
type CategoryRow = { id: number; label: string }
type TicketCategoryRow = { ticket_id: number; category_id: number }
type UserRow = { id: number; nom_complet: string }

const supabase = import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null

const requireSupabase = () => {
  if (!supabase) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis en développement.')
  return supabase
}

const statusFromDatabase = (value: string): Status => {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized === 'en cours') return 'EN_COURS'
  if (normalized === 'en attente') return 'EN_ATTENTE'
  if (normalized === 'termine') return 'TERMINE'
  return 'NOUVEAU'
}

const statusToDatabase: Record<Status, string> = {
  NOUVEAU: 'nouveau',
  EN_COURS: 'en cours',
  EN_ATTENTE: 'en attente',
  TERMINE: 'terminé',
}

const loadTickets = async (): Promise<Ticket[]> => {
  const client = requireSupabase()
  const [ticketsResult, roomsResult, categoriesResult, linksResult, usersResult] = await Promise.all([
    client.from('tickets').select('*').order('created_at', { ascending: false }),
    client.from('salles').select('id, nom'),
    client.from('categories_incident').select('id, label'),
    client.from('ticket_categories').select('ticket_id, category_id'),
    client.from('utilisateurs').select('id, nom_complet'),
  ])

  const error = ticketsResult.error || roomsResult.error || categoriesResult.error || linksResult.error || usersResult.error
  if (error) throw error

  const rooms = new Map((roomsResult.data as NamedRow[]).map(row => [row.id, row.nom]))
  const categories = new Map((categoriesResult.data as CategoryRow[]).map(row => [row.id, row.label]))
  const users = new Map((usersResult.data as UserRow[]).map(row => [row.id, row.nom_complet]))
  const categoryIdsByTicket = new Map<number, number[]>()
  for (const link of linksResult.data as TicketCategoryRow[]) {
    categoryIdsByTicket.set(link.ticket_id, [...(categoryIdsByTicket.get(link.ticket_id) ?? []), link.category_id])
  }

  return (ticketsResult.data as TicketRow[]).map(row => ({
    id: String(row.id),
    date: row.created_at.slice(0, 10),
    name: row.demandeur_nom,
    email: row.demandeur_email,
    room: rooms.get(row.salle_id) ?? `Salle ${row.salle_id}`,
    types: (categoryIdsByTicket.get(row.id) ?? []).map(id => categories.get(id)).filter((label): label is string => Boolean(label)),
    title: row.titre,
    comment: row.description,
    risk: row.risque_accident,
    photo: row.image_url,
    status: statusFromDatabase(row.statut),
    handler: row.assigne_a_id ? users.get(row.assigne_a_id) ?? '' : '',
    adminComment: row.commentaire_admin ?? '',
  }))
}

export const ticketService = {
  async list(): Promise<Ticket[]> {
    if (import.meta.env.DEV) return loadTickets()

    const response = await fetch('/api/tickets')
    if (!response.ok) throw new Error('Impossible de charger les tickets.')
    return response.json() as Promise<Ticket[]>
  },

  async create(form: FormData): Promise<Ticket> {
    if (import.meta.env.DEV) {
      const client = requireSupabase()
      const [roomResult, categoriesResult] = await Promise.all([
        client.from('salles').select('id').eq('nom', form.room).maybeSingle(),
        client.from('categories_incident').select('id, label').in('label', form.types),
      ])
      if (roomResult.error) throw roomResult.error
      if (categoriesResult.error) throw categoriesResult.error
      if (!roomResult.data) throw new Error(`La salle « ${form.room} » n'existe pas dans Supabase.`)

      const { data, error } = await client.from('tickets').insert({
        demandeur_nom: form.name,
        demandeur_email: form.email,
        salle_id: roomResult.data.id,
        titre: form.title,
        description: form.comment,
        image_url: form.photo,
        risque_accident: form.risk,
        statut: 'nouveau',
      }).select('id').single()
      if (error) throw error

      const links = (categoriesResult.data as CategoryRow[]).map(category => ({ ticket_id: data.id, category_id: category.id }))
      if (links.length) {
        const { error: linkError } = await client.from('ticket_categories').insert(links)
        if (linkError) throw linkError
      }

      const tickets = await loadTickets()
      const created = tickets.find(ticket => ticket.id === String(data.id))
      if (!created) throw new Error('Le ticket a été créé mais ne peut pas être relu.')
      return created
    }

    const response = await fetch('/api/tickets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (!response.ok) throw new Error('Impossible de créer le ticket.')
    return response.json() as Promise<Ticket>
  },

  async update(id: string, field: TicketField, value: string): Promise<void> {
    if (import.meta.env.DEV) {
      const client = requireSupabase()
      let update: Record<string, string | number | null>
      if (field === 'status') {
        update = { statut: statusToDatabase[value as Status] }
      } else if (field === 'adminComment') {
        update = { commentaire_admin: value }
      } else {
        const { data, error } = await client.from('utilisateurs').select('id').ilike('nom_complet', value).maybeSingle()
        if (error) throw error
        if (value && !data) throw new Error(`L'utilisateur « ${value} » n'existe pas dans Supabase.`)
        update = { assigne_a_id: data?.id ?? null }
      }
      const { error } = await client.from('tickets').update(update).eq('id', Number(id))
      if (error) throw error
      return
    }

    const response = await fetch(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field, value }),
    })
    if (!response.ok) throw new Error('Impossible de mettre à jour le ticket.')
  },
}
