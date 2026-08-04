import { useEffect } from 'react'
import { Icons } from '../Icons/Icons'

interface ToastProps {
  message: string
  type: 'danger' | 'success'
  onClose: () => void
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      // `role="alert"` interrompt le lecteur d'écran pour une erreur ;
      // `status` attend une pause pour une simple confirmation.
      role={type === 'danger' ? 'alert' : 'status'}
      aria-live={type === 'danger' ? 'assertive' : 'polite'}
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md p-4 rounded shadow-xl flex items-center gap-3 animate-slide-up z-50 ${type === 'danger' ? 'bg-red-700 text-white' : 'bg-green-700 text-white'}`}
    >
      {type === 'danger' && <Icons.Alert />}
      <span className="font-medium flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la notification"
        className="shrink-0 w-11 h-11 -my-2 -mr-2 flex items-center justify-center rounded opacity-75 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Icons.Close />
      </button>
    </div>
  )
}
