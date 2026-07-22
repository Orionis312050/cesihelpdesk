/**
 * État possible d'un ticket d'incident
 * - NOUVEAU: Ticket venant d'être créé
 * - EN_COURS: Ticket en cours de traitement
 * - EN_ATTENTE: Ticket en attente de réponse
 * - TERMINE: Ticket résolu
 */
export type Status = 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE'

/**
 * Vue affichée dans l'interface principale
 * - USER_FORM: Formulaire de création d'incident (public)
 * - ADMIN_FORM: Formulaire d'administration
 * - ADMIN_LIST: Tableau de suivi des incidents
 * - ADMIN_STATS: Statistiques des incidents
 */
export type View = 'USER_FORM' | 'ADMIN_FORM' | 'ADMIN_LIST' | 'ADMIN_STATS'

/**
 * Champs d'un ticket modifiables par l'administrateur
 */
export type TicketField = 'status' | 'handler' | 'adminComment'

/**
 * Données d'un formulaire de création d'incident
 */
export interface FormData {
  /** Nom complet du demandeur */
  name: string
  /** Email de contact du demandeur */
  email: string
  /** Salle/location de l'incident */
  room: string
  /** Types d'incidents associés */
  types: string[]
  /** Titre de l'incident */
  title: string
  /** Description détaillée */
  comment: string
  /** Indique si c'est un incident urgent/dangereux */
  risk: boolean
  /** Photo de l'incident (URL ou base64) */
  photo: string | null
}

/**
 * Ticket d'incident complet avec métadonnées
 */
export interface Ticket extends FormData {
  /** Identifiant unique du ticket */
  id: string
  /** Date de création du ticket */
  date: string
  /** État actuel du ticket */
  status: Status
  /** Administrateur responsable du ticket */
  handler: string
  /** Commentaire de l'administrateur */
  adminComment: string
}

/**
 * Notification de toast (message temporaire)
 */
export interface ToastState {
  /** Type de notification: danger (erreur) ou success (succès) */
  type: 'danger' | 'success'
  /** Texte du message */
  message: string
}
