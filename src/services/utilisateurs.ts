/**
 * Service d'accès à l'annuaire du personnel.
 *
 * Alimente la liste déroulante « Traitant » du tableau de suivi. L'ancienne
 * version stockait un nom libre et cherchait l'utilisateur par comparaison de
 * chaîne : une faute de frappe faisait échouer l'affectation. On manipule
 * désormais des identifiants.
 *
 * Cette table n'est jamais lisible par un visiteur anonyme (noms et adresses
 * professionnelles — RGPD).
 */

import { supabase } from '../lib/supabase'
import type { Profil, Role } from '../types/auth'

type UtilisateurRow = {
  id: string
  nom_complet: string
  email: string
  role: Role
  actif: boolean
}

const mapProfil = (row: UtilisateurRow): Profil => ({
  id: row.id,
  nomComplet: row.nom_complet,
  email: row.email,
  role: row.role,
  actif: row.actif,
})

export const utilisateurService = {
  /**
   * Charge le compte du personnel correspondant à un identifiant d'authentification.
   *
   * @param id Identifiant `auth.users.id`.
   * @returns Le profil, ou `null` si le compte n'est pas habilité.
   * @throws {Error} Si la requête échoue.
   */
  async getProfil(id: string): Promise<Profil | null> {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom_complet, email, role, actif')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`Impossible de charger le profil : ${error.message}`)
    return data ? mapProfil(data as UtilisateurRow) : null
  },

  /**
   * Liste les membres actifs du personnel, triés par nom.
   *
   * @returns Liste des profils pouvant se voir affecter un incident.
   * @throws {Error} Si la requête échoue.
   */
  async listActifs(): Promise<Profil[]> {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom_complet, email, role, actif')
      .eq('actif', true)
      .order('nom_complet', { ascending: true })

    if (error) throw new Error(`Impossible de charger l'annuaire : ${error.message}`)
    return (data as UtilisateurRow[]).map(mapProfil)
  },
}
