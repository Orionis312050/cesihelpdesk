/**
 * Envoi des notifications par e-mail.
 *
 * Deux modes :
 * - `urgent` : alerte immédiate, déclenchée par la base à l'insertion d'un
 *   incident dont la case « Risque d'accident » est cochée ;
 * - `recap` : récapitulatif hebdomadaire, déclenché par `pg_cron` le vendredi.
 *
 * POURQUOI LE DÉCLENCHEUR EST EN BASE ET NON DANS LE NAVIGATEUR :
 * l'ancienne version affichait « un email a été envoyé aux responsables » alors
 * qu'aucun envoi n'existait. Faire appeler cette fonction par le navigateur
 * reproduirait le même défaut sous une autre forme : l'onglet peut être fermé,
 * le réseau peut tomber, et personne ne serait prévenu. Déclenché par un
 * trigger Postgres, l'envoi est lié à l'écriture du ticket.
 *
 * SÉCURITÉ : la fonction est déployée avec `verify_jwt = false`. Vérifier le
 * JWT ne protégerait rien ici, puisque la clé publiable est un JWT valide
 * présent dans le bundle JavaScript envoyé à tous les visiteurs. L'accès est
 * donc contrôlé par un en-tête secret partagé avec la base.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { envoyer, listerDestinataires } from '../_shared/courriel.ts'
import { alerteUrgente, recapHebdomadaire, type TicketCourriel } from '../_shared/modeles.ts'

interface CorpsRequete {
  mode?: 'urgent' | 'recap'
  ticket_id?: number
}

type LigneTicket = Omit<TicketCourriel, 'salle' | 'types'> & {
  salles: { nom: string } | null
  ticket_categories: { categories_incident: { label: string } | null }[]
}

const SELECTION = `
  id, titre, demandeur_nom, demandeur_email, description,
  risque_accident, created_at,
  salles ( nom ),
  ticket_categories ( categories_incident ( label ) )
`

const aplatir = (ligne: LigneTicket): TicketCourriel => ({
  id: ligne.id,
  titre: ligne.titre,
  salle: ligne.salles?.nom ?? 'Salle inconnue',
  demandeur_nom: ligne.demandeur_nom,
  demandeur_email: ligne.demandeur_email,
  description: ligne.description,
  risque_accident: ligne.risque_accident,
  created_at: ligne.created_at,
  types: ligne.ticket_categories
    .map(lien => lien.categories_incident?.label)
    .filter((label): label is string => Boolean(label)),
})

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * Rend une cause d'erreur lisible.
 *
 * `String(cause)` produit « [object Object] » sur les erreurs PostgREST, qui
 * sont des objets simples et non des instances d'`Error` : le message réel
 * (colonne inconnue, politique refusée…) est alors totalement perdu.
 */
const decrire = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message
  if (cause && typeof cause === 'object') {
    const { message, details, hint, code } = cause as Record<string, unknown>
    const morceaux = [message, details, hint, code && `(code ${code})`].filter(Boolean)
    if (morceaux.length) return morceaux.join(' — ')
    return JSON.stringify(cause)
  }
  return String(cause)
}

Deno.serve(async requete => {
  // Contrôle d'accès : sans ce secret, n'importe qui pourrait déclencher des
  // envois en masse depuis Internet.
  const attendu = Deno.env.get('FUNCTION_SECRET')
  if (!attendu) return reponse({ erreur: 'FUNCTION_SECRET non configuré.' }, 500)
  if (requete.headers.get('x-secret-notifications') !== attendu) {
    return reponse({ erreur: 'Accès refusé.' }, 401)
  }

  const { mode = 'urgent', ticket_id }: CorpsRequete = await requete.json().catch(() => ({}))

  // Clé de service : la fonction doit lire les tickets, que les politiques RLS
  // réservent au personnel connecté. Cette clé ne quitte jamais le serveur.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const urlApplication = (Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/+$/, '')

  try {
    if (mode === 'urgent') {
      if (!ticket_id) return reponse({ erreur: 'ticket_id manquant.' }, 400)

      const { data, error } = await supabase.from('tickets').select(SELECTION).eq('id', ticket_id).single()
      if (error) throw error

      const ticket = aplatir(data as unknown as LigneTicket)
      const destinataires = listerDestinataires(Deno.env.get('ALERT_RECIPIENTS') ?? '')
      const message = alerteUrgente(ticket, urlApplication ? `${urlApplication}/incident/${ticket.id}` : '')

      const resultat = await envoyer({ destinataires, ...message })

      await supabase.from('email_log').insert({
        type: 'urgent',
        ticket_id: ticket.id,
        destinataires: destinataires.join(', ') || '(aucun)',
        statut: resultat.statut,
        erreur: resultat.erreur ?? null,
      })

      return reponse({ mode, ticket_id, statut: resultat.statut, erreur: resultat.erreur })
    }

    // Récapitulatif : les incidents déclarés depuis 7 jours.
    const fin = new Date()
    const debut = new Date(fin.getTime() - 7 * 86_400_000)

    const { data, error } = await supabase
      .from('tickets')
      .select(SELECTION)
      .gte('created_at', debut.toISOString())
      .lte('created_at', fin.toISOString())
      .order('created_at', { ascending: false })
    if (error) throw error

    const tickets = (data as unknown as LigneTicket[]).map(aplatir)
    const destinataires = listerDestinataires(Deno.env.get('WEEKLY_RECIPIENTS') ?? '')
    const message = recapHebdomadaire(
      tickets,
      debut.toISOString(),
      fin.toISOString(),
      urlApplication ? `${urlApplication}/suivi` : '',
    )

    const resultat = await envoyer({ destinataires, ...message })

    await supabase.from('email_log').insert({
      type: 'recap',
      ticket_id: null,
      destinataires: destinataires.join(', ') || '(aucun)',
      statut: resultat.statut,
      erreur: resultat.erreur ?? null,
    })

    return reponse({ mode, incidents: tickets.length, statut: resultat.statut, erreur: resultat.erreur })
  } catch (cause) {
    const detail = decrire(cause)
    console.error('[notifications] échec :', detail)
    return reponse({ erreur: detail }, 500)
  }
})
