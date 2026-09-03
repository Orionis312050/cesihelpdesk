/**
 * État d'un ticket d'incident.
 *
 * Ces quatre clés sont aussi les valeurs du type énuméré `statut_ticket` en base :
 * aucune conversion n'est nécessaire entre l'application et Postgres.
 * Les libellés affichés sont définis dans `src/data/helpdesk.ts`.
 *
 * - `NOUVEAU` : déclaré, pas encore pris en charge
 * - `EN_COURS` : un technicien travaille dessus
 * - `EN_ATTENTE` : bloqué (pièce à commander, intervenant externe…)
 * - `TERMINE` : résolu
 */
export type Status = 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE'

/** Champs d'un ticket qu'un membre du personnel peut modifier. */
export type TicketField = 'status' | 'handler' | 'adminComment'

/**
 * Données saisies dans le formulaire de déclaration d'incident.
 *
 * Nommé `TicketInput` et non `FormData` : ce dernier est un type natif du
 * navigateur, et le masquer prête à confusion.
 */
export interface TicketInput {
  /** Nom et prénom du déclarant */
  name: string
  /** Adresse e-mail de contact */
  email: string
  /** Nom de la salle concernée */
  room: string
  /** Types d'incident cochés (choix multiple) */
  types: string[]
  /** Titre court de l'intervention */
  title: string
  /** Description détaillée */
  comment: string
  /** Risque d'accident ou de blessure signalé */
  risk: boolean
  /** Chemin de la photo dans le bucket Storage, ou `null` */
  photoPath: string | null
}

/** Ticket d'incident tel que lu depuis la base. */
export interface Ticket {
  /** Identifiant du ticket, affiché au déclarant comme numéro de demande */
  id: string
  /** Date et heure de déclaration (ISO 8601 complet) */
  createdAt: string
  /** Nom et prénom du déclarant */
  name: string
  /** Adresse e-mail de contact */
  email: string
  /** Nom de la salle concernée */
  room: string
  /** Types d'incident associés */
  types: string[]
  /** Titre de l'intervention */
  title: string
  /** Description détaillée */
  comment: string
  /** Risque d'accident ou de blessure signalé */
  risk: boolean
  /** Chemin de la photo dans le bucket Storage, ou `null` */
  photoPath: string | null
  /** État d'avancement */
  status: Status
  /** Nom du technicien affecté, chaîne vide si non assigné */
  handler: string
  /** Identifiant du technicien affecté, `null` si non assigné */
  handlerId: string | null
  /** Commentaire de suivi rédigé par le personnel */
  adminComment: string
  /** Date de passage au statut `TERMINE`, `null` si non résolu */
  resolvedAt: string | null
}

/** Salle du campus, telle que lue dans la table `salles`. */
export interface Salle {
  /** Identifiant technique, stable même après un renommage */
  id: number
  /** Nom affiché dans le formulaire et encodé dans les QR codes — unique */
  nom: string
  /** Bâtiment, chaîne vide si non renseigné */
  batiment: string
  /** Une salle désactivée disparaît du formulaire, ses incidents restent lisibles */
  actif: boolean
}

/** Champs d'une salle saisis par un administrateur. */
export type SalleInput = Pick<Salle, 'nom' | 'batiment'>

/** Notification temporaire affichée en bas d'écran. */
export interface ToastState {
  /** `danger` pour une erreur, `success` pour une confirmation */
  type: 'danger' | 'success'
  /** Texte affiché */
  message: string
}
