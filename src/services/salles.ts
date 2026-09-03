/**
 * Service de gestion des salles, réservé aux administrateurs.
 *
 * Distinct de `helpdeskData.ts`, qui ne fait que *lire* les salles actives
 * pour le formulaire public, avec un cache : ici on lit tout, inactives
 * comprises, et on écrit. Chaque écriture vide ce cache pour que le formulaire
 * reflète la modification sans attendre cinq minutes.
 *
 * Aucune suppression : `tickets.salle_id` est en `on delete restrict`, une
 * salle qui porte un historique ne peut pas disparaître. On la désactive.
 */

import { supabase } from '../lib/supabase'
import type { Salle, SalleInput } from '../types/helpdesk'
import { helpdeskDataService } from './helpdeskData'

type SalleRow = {
  id: number
  nom: string
  batiment: string | null
  actif: boolean
}

const SELECTION = 'id, nom, batiment, actif'

const mapSalle = (row: SalleRow): Salle => ({
  id: row.id,
  nom: row.nom,
  batiment: row.batiment ?? '',
  actif: row.actif,
})

/** Prépare la saisie pour la base : espaces retirés, bâtiment vide stocké en `null`. */
const versLigne = (saisie: SalleInput) => ({
  nom: saisie.nom.trim(),
  batiment: saisie.batiment.trim() || null,
})

/**
 * Traduit une erreur PostgREST en message lisible.
 *
 * `23505` est la violation d'unicité : c'est le seul cas courant qui mérite un
 * message dédié, la contrainte `salles_nom_key` étant sinon renvoyée telle
 * quelle en anglais.
 */
const messageErreur = (error: { code?: string; message: string }, repli: string): string =>
  error.code === '23505' ? 'Une salle porte déjà ce nom.' : `${repli} : ${error.message}`

export const salleService = {
  /**
   * Liste toutes les salles, actives ou non, triées par nom.
   *
   * Les politiques RLS ne montrent les salles inactives qu'au personnel
   * connecté : un visiteur anonyme ne verrait que les actives.
   *
   * @returns Liste des salles.
   * @throws {Error} Si la requête échoue.
   */
  async listerToutes(): Promise<Salle[]> {
    const { data, error } = await supabase
      .from('salles')
      .select(SELECTION)
      .order('nom', { ascending: true })

    if (error) throw new Error(`Impossible de charger les salles : ${error.message}`)
    return (data as SalleRow[]).map(mapSalle)
  },

  /**
   * Crée une salle, active par défaut.
   *
   * @param saisie Nom (obligatoire, unique) et bâtiment (facultatif).
   * @returns La salle créée, avec son identifiant.
   * @throws {Error} Si le nom est déjà pris ou si l'écriture est refusée.
   *
   * @example
   * const salle = await salleService.creer({ nom: 'B305', batiment: 'Bâtiment B' })
   */
  async creer(saisie: SalleInput): Promise<Salle> {
    const { data, error } = await supabase
      .from('salles')
      .insert(versLigne(saisie))
      .select(SELECTION)
      .single()

    if (error) throw new Error(messageErreur(error, "Impossible d'ajouter la salle"))
    helpdeskDataService.clearCache()
    return mapSalle(data as SalleRow)
  },

  /**
   * Renomme une salle ou change son bâtiment.
   *
   * Les incidents passés suivent automatiquement : ils référencent la salle par
   * son identifiant. En revanche, une affiche déjà imprimée encode l'ancien nom
   * dans son QR code — elle est à réimprimer.
   *
   * @param id Identifiant de la salle.
   * @param saisie Nouveau nom et nouveau bâtiment.
   * @throws {Error} Si le nom est déjà pris ou si l'écriture est refusée.
   */
  async modifier(id: number, saisie: SalleInput): Promise<void> {
    const { error } = await supabase
      .from('salles')
      .update(versLigne(saisie))
      .eq('id', id)

    if (error) throw new Error(messageErreur(error, 'Impossible de modifier la salle'))
    helpdeskDataService.clearCache()
  },

  /**
   * Active ou désactive une salle.
   *
   * @param id Identifiant de la salle.
   * @param actif `false` pour la retirer du formulaire, `true` pour l'y remettre.
   * @throws {Error} Si l'écriture est refusée.
   */
  async definirActif(id: number, actif: boolean): Promise<void> {
    const { error } = await supabase
      .from('salles')
      .update({ actif })
      .eq('id', id)

    if (error) throw new Error(`Impossible de changer l'état de la salle : ${error.message}`)
    helpdeskDataService.clearCache()
  },
}
