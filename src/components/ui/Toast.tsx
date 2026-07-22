import { useEffect } from 'react'
import { Icons } from './Icons'

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
    <div className={`fixed bottom-4 right-4 p-4 rounded shadow-xl flex items-center gap-3 animate-slide-up z-50 ${type === 'danger' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
      {type === 'danger' && <Icons.Alert />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 font-bold opacity-75 hover:opacity-100">&times;</button>
    </div>
  )
}
