/**
 * Tâches d'entretien de la base, déclenchées par `pg_cron` via `pg_net`.
 *
 * Un seul mode pour l'instant :
 * - `purge_photos` : retire du bucket « incidents » les photos des incidents
 *   déclarés depuis plus de N mois — six par défaut, réglables dans
 *   `public.configuration` (clé `retention_photos_mois`) — puis efface
 *   `tickets.image_chemin` et horodate `tickets.image_supprimee_le`. Le reste
 *   de la fiche (description, statut, commentaires) est conservé.
 *
 * POURQUOI UNE FONCTION ET PAS DU SQL SEUL : supprimer une ligne de
 * `storage.objects` en SQL retire l'entrée du catalogue mais laisse le fichier
 * sur le disque de la VM — l'espace n'est pas libéré. Seul le service Storage,
 * appelé par son API, efface les deux. Cette API demande la clé de service, qui
 * ne quitte jamais le serveur : d'où une fonction Edge appelée par la base, sur
 * le modèle des notifications.
 *
 * ORDRE DES OPÉRATIONS : les objets d'abord, la base ensuite. Si Storage
 * refuse la suppression, le chemin reste en base, la fiche affiche encore la
 * photo et la tâche réessaie le lendemain. L'ordre inverse laisserait des
 * fichiers orphelins, invisibles et jamais nettoyés.
 *
 * SÉCURITÉ : `verify_jwt = false` et en-tête secret partagé
 * (`x-secret-maintenance`), pour la même raison que « notifications » : la clé
 * publiable est un JWT valide, présent dans le JavaScript envoyé à tous les
 * visiteurs. Sans le secret, n'importe qui pourrait effacer toutes les photos
 * en passant `mois = 1`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { reculerDeMois } from '../_shared/dates.ts'

interface CorpsRequete {
  mode?: 'purge_photos'
  /** Durée de conservation en mois, entier de 1 à 120. Défaut : 6. */
  mois?: number
  /** Si vrai, compte ce qui serait supprimé sans rien toucher. */
  simulation?: boolean
}

/** Bucket des photos d'incident (voir la migration storage_incidents). */
const BUCKET_INCIDENTS = 'incidents'

/** Durée de conservation appliquée quand l'appel n'en précise pas. */
const RETENTION_PAR_DEFAUT = 6

/** Objets supprimés par appel à l'API Storage. */
const TAILLE_LOT = 100

/**
 * Plafond par exécution. La passerelle coupe une fonction à 150 s ; au-delà de
 * ce nombre, le reste attend l'exécution du lendemain — la tâche est
 * quotidienne, le retard se résorbe seul.
 */
const MAX_PAR_EXECUTION = 2000

type TicketAPurger = { id: number; image_chemin: string }

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

/** Rend une cause d'erreur lisible (une erreur PostgREST n'est pas une `Error`). */
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
  const attendu = Deno.env.get('FUNCTION_SECRET')
  if (!attendu) return reponse({ erreur: 'FUNCTION_SECRET non configuré.' }, 500)
  if (requete.headers.get('x-secret-maintenance') !== attendu) {
    return reponse({ erreur: 'Accès refusé.' }, 401)
  }

  const corps: CorpsRequete = await requete.json().catch(() => ({}))
  if (corps.mode !== 'purge_photos') return reponse({ erreur: 'Mode inconnu.' }, 400)

  // Une valeur explicite mais absurde est refusée plutôt que ramenée au défaut :
  // « mois = 0 » ne doit jamais se transformer en « six mois » en silence.
  let mois = RETENTION_PAR_DEFAUT
  if (corps.mois !== undefined) {
    if (!Number.isInteger(corps.mois) || corps.mois < 1 || corps.mois > 120) {
      return reponse({ erreur: 'mois doit être un entier de 1 à 120.' }, 400)
    }
    mois = corps.mois
  }
  const simulation = corps.simulation === true
  const dateLimite = reculerDeMois(new Date(), mois).toISOString()

  // Clé de service : lecture de tous les tickets et suppression dans un bucket
  // que seuls les administrateurs peuvent vider. Cette clé ne quitte jamais le
  // serveur.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  try {
    if (simulation) {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .not('image_chemin', 'is', null)
        .lt('created_at', dateLimite)
      if (error) throw error

      const resultat = { mode: 'purge_photos', simulation: true, mois, date_limite: dateLimite, a_supprimer: count ?? 0 }
      console.log('[maintenance]', JSON.stringify(resultat))
      return reponse(resultat)
    }

    let supprimees = 0
    while (supprimees < MAX_PAR_EXECUTION) {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, image_chemin')
        .not('image_chemin', 'is', null)
        .lt('created_at', dateLimite)
        .order('id', { ascending: true })
        .limit(TAILLE_LOT)
      if (error) throw error

      const lot = (data ?? []) as TicketAPurger[]
      if (lot.length === 0) break

      // Objets d'abord (voir l'en-tête). `remove` ignore un chemin qui n'existe
      // plus : la base est alors simplement mise à jour.
      const { error: erreurStorage } = await supabase.storage
        .from(BUCKET_INCIDENTS)
        .remove(lot.map(ticket => ticket.image_chemin))
      if (erreurStorage) throw erreurStorage

      const { error: erreurBase } = await supabase
        .from('tickets')
        .update({ image_chemin: null, image_supprimee_le: new Date().toISOString() })
        .in('id', lot.map(ticket => ticket.id))
      if (erreurBase) throw erreurBase

      supprimees += lot.length
    }

    const resultat = {
      mode: 'purge_photos',
      simulation: false,
      mois,
      date_limite: dateLimite,
      supprimees,
      plafond_atteint: supprimees >= MAX_PAR_EXECUTION,
    }
    console.log('[maintenance]', JSON.stringify(resultat))
    return reponse(resultat)
  } catch (cause) {
    const detail = decrire(cause)
    console.error('[maintenance] échec :', detail)
    return reponse({ erreur: detail }, 500)
  }
})
