import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from '../context/toastContext'

/**
 * Accède aux notifications temporaires.
 *
 * @returns Fonctions d'affichage de notification.
 * @throws {Error} Si appelé en dehors de `<ToastProvider>`.
 *
 * @example
 * const toast = useToast()
 * toast.succes('Votre demande n° 42 a bien été prise en compte.')
 */
export const useToast = (): ToastContextValue => {
  const contexte = useContext(ToastContext)
  if (!contexte) throw new Error('useToast doit être utilisé dans un <ToastProvider>.')
  return contexte
}
