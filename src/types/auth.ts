/**
 * Rôle d'un membre du personnel.
 *
 * - `admin` : accès complet (suivi, statistiques, QR codes, gestion des salles et des comptes)
 * - `technicien` : suivi et traitement des incidents uniquement
 *
 * Le rôle est stocké dans `utilisateurs.role` et vérifié **côté base** par les
 * politiques RLS. Le masquer dans l'interface est un confort, pas une sécurité.
 */
export type Role = 'admin' | 'technicien'

/** Compte du personnel, tel que lu dans la table `utilisateurs`. */
export interface Profil {
  /** Identifiant, identique à `auth.users.id` */
  id: string
  /** Nom complet affiché dans la colonne « Traitant » */
  nomComplet: string
  /** Adresse e-mail professionnelle (sert aussi d'identifiant de connexion) */
  email: string
  /** Rôle attribué */
  role: Role
  /** Un compte désactivé ne peut plus rien lire ni modifier */
  actif: boolean
}
