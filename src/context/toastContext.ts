import { createContext } from 'react'
import type { ToastState } from '../types/helpdesk'

/** Valeur exposée par le contexte de notifications. */
export interface ToastContextValue {
  /** Affiche une confirmation */
  succes: (message: string) => void
  /** Affiche une erreur */
  erreur: (message: string) => void
  /** Affiche une erreur à partir d'une exception, avec un message de repli */
  erreurDe: (cause: unknown, repli: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/** État interne du bandeau de notification (exporté pour les tests). */
export type { ToastState }
