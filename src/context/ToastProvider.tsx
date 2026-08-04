import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Toast } from '../components/ui/Toast/Toast'
import type { ToastState } from '../types/helpdesk'
import { ToastContext, type ToastContextValue } from './toastContext'

interface ToastProviderProps {
  children: ReactNode
}

/** Affiche les notifications temporaires et expose les fonctions pour en déclencher. */
export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toast, setToast] = useState<ToastState | null>(null)

  const succes = useCallback((message: string) => setToast({ type: 'success', message }), [])
  const erreur = useCallback((message: string) => setToast({ type: 'danger', message }), [])

  const erreurDe = useCallback((cause: unknown, repli: string) => {
    setToast({ type: 'danger', message: cause instanceof Error ? cause.message : repli })
  }, [])

  const fermer = useCallback(() => setToast(null), [])

  const valeur = useMemo<ToastContextValue>(
    () => ({ succes, erreur, erreurDe }),
    [succes, erreur, erreurDe],
  )

  return (
    <ToastContext value={valeur}>
      {children}
      {toast && <Toast type={toast.type} message={toast.message} onClose={fermer} />}
    </ToastContext>
  )
}
