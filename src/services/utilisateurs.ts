/**
 * Service d'accès et de gestion de l'annuaire du personnel.
 *
 * Alimente la liste déroulante « Traitant » du tableau de suivi. L'ancienne
 * version stockait un nom libre et cherchait l'utilisateur par comparaison de
 * chaîne : une faute de frappe faisait échouer l'affectation. On manipule
 * désormais des identifiants.
 *
 * Cette table n'est jamais lisible par un visiteur anonyme (noms et adresses
 * professionnelles — RGPD).
 *
 * Les écritures sont réservées aux administrateurs par la politique
 * `utilisateurs_gestion_admin`, et limitées aux colonnes `nom_complet`, `role`
 * et `actif` par un GRANT au niveau colonne. Ni création ni suppression :
 * l'identité vit dans `auth.users`, hors de portée du navigateur (voir
 * `deploy/scripts/creer-compte-admin.sh`), et un compte porte l'historique des
 * incidents qu'il a traités.
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

const SELECTION = 'id, nom_complet, email, role, actif'

const mapProfil = (row: UtilisateurRow): Profil => ({
  id: row.id,
  nomComplet: row.nom_complet,
  email: row.email,
  role: row.role,
  actif: row.actif,
})

/**
 * Traduit une erreur PostgREST en message lisible.
 *
 * `P0001` est le code d'un `raise exception` : le message vient de la base et
 * s'adresse déjà à l'administrateur (dernier administrateur actif, par
 * exemple). Le noyer derrière un repli générique perdrait la seule explication
 * utile. `42501` est le refus d'un GRANT : la colonne visée n'est pas
 * modifiable depuis l'application.
 */
const messageErreur = (error: { code?: string; message: string }, repli: string): string => {
  if (error.code === 'P0001') return error.message
  if (error.code === '42501') return `${repli} : cette modification n'est pas autorisée depuis l'application.`
  return `${repli} : ${error.message}`
}

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
      .select(SELECTION)
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
      .select(SELECTION)
      .eq('actif', true)
      .order('nom_complet', { ascending: true })

    if (error) throw new Error(`Impossible de charger l'annuaire : ${error.message}`)
    return (data as UtilisateurRow[]).map(mapProfil)
  },

  /**
   * Liste tous les comptes, désactivés compris, triés par nom.
   *
   * Réservé à l'écran d'administration : un compte désactivé n'a rien à faire
   * dans la liste des traitants, d'où la méthode distincte de `listActifs`.
   *
   * @returns Liste de tous les comptes du personnel.
   * @throws {Error} Si la requête échoue.
   */
  async listerTous(): Promise<Profil[]> {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select(SELECTION)
      .order('nom_complet', { ascending: true })

    if (error) throw new Error(`Impossible de charger la liste des comptes : ${error.message}`)
    return (data as UtilisateurRow[]).map(mapProfil)
  },

  /**
   * Corrige le nom affiché d'un compte.
   *
   * Ce nom apparaît dans la colonne « Traitant » des incidents déjà traités :
   * la correction est rétroactive, les fiches référençant le compte par son
   * identifiant.
   *
   * @param id Identifiant du compte.
   * @param nomComplet Nouveau nom affiché.
   * @throws {Error} Si l'écriture est refusée.
   */
  async renommer(id: string, nomComplet: string): Promise<void> {
    const { error } = await supabase
      .from('utilisateurs')
      .update({ nom_complet: nomComplet.trim() })
      .eq('id', id)

    if (error) throw new Error(messageErreur(error, 'Impossible de renommer le compte'))
  },

  /**
   * Change le rôle d'un compte.
   *
   * L'effet est immédiat côté données : les politiques RLS relisent la table à
   * chaque requête. En revanche, la personne concernée doit recharger la page
   * pour que son menu reflète le nouveau rôle.
   *
   * @param id Identifiant du compte.
   * @param role `admin` ou `technicien`.
   * @throws {Error} Si l'écriture est refusée, notamment sur le dernier administrateur actif.
   */
  async definirRole(id: string, role: Role): Promise<void> {
    const { error } = await supabase
      .from('utilisateurs')
      .update({ role })
      .eq('id', id)

    if (error) throw new Error(messageErreur(error, 'Impossible de changer le rôle'))
  },

  /**
   * Active ou désactive un compte.
   *
   * Un compte désactivé ne lit plus rien (les politiques RLS exigent
   * `actif = true`) et disparaît de la liste des traitants, mais les incidents
   * qu'il a traités conservent son nom.
   *
   * @param id Identifiant du compte.
   * @param actif `false` pour couper l'accès, `true` pour le rétablir.
   * @throws {Error} Si l'écriture est refusée, notamment sur le dernier administrateur actif.
   */
  async definirActif(id: string, actif: boolean): Promise<void> {
    const { error } = await supabase
      .from('utilisateurs')
      .update({ actif })
      .eq('id', id)

    if (error) throw new Error(messageErreur(error, "Impossible de changer l'état du compte"))
  },
}
