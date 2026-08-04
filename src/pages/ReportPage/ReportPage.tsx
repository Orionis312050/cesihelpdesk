import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { UserForm } from '../../components/forms/UserForm/UserForm'
import { useAuth } from '../../hooks/useAuth'
import { useTickets } from '../../hooks/useTickets'
import { useToast } from '../../hooks/useToast'
import { storageService } from '../../services/storage'
import { ticketService } from '../../services/tickets'
import type { TicketInput } from '../../types/helpdesk'
import type { ImageCompressee } from '../../utils/imageCompression'
import { parseRoomParam } from '../../utils/qr'

/**
 * Page publique de déclaration d'incident.
 *
 * Trois points d'entrée pour le même formulaire :
 * - `/signaler` : saisie libre de la salle ;
 * - `/salle/:salle` : salle imposée par le QR code scanné ;
 * - `/nouveau` : saisie par un membre du personnel depuis l'espace admin.
 */
export const ReportPage = () => {
  const { salle } = useParams()
  const [parametres] = useSearchParams()
  const emplacement = useLocation()
  const navigate = useNavigate()
  const { profil } = useAuth()
  const { recharger } = useTickets()
  const toast = useToast()
  const [numeroCree, setNumeroCree] = useState<string | null>(null)

  const contexteAdmin = emplacement.pathname === '/nouveau'
  // `?salle=` est toléré pour les affiches imprimées avant le passage aux URL
  // en `/salle/:salle`.
  const salleImposee = parseRoomParam(salle ?? parametres.get('salle')) || undefined

  const envoyer = async (data: TicketInput, photo: ImageCompressee | null) => {
    try {
      // La photo est envoyée maintenant, pas à la sélection : un formulaire
      // abandonné ne laisse ainsi aucun fichier orphelin dans le stockage.
      let photoPath: string | null = null
      if (photo) photoPath = await storageService.envoyerPhoto(photo.fichier)

      const numero = await ticketService.create({ ...data, photoPath })

      if (contexteAdmin) {
        await recharger()
        toast.succes(`Incident n° ${numero} enregistré.`)
        navigate('/suivi')
        return
      }

      if (profil) await recharger()
      setNumeroCree(numero)
      toast.succes(`Votre demande n° ${numero} a bien été enregistrée.`)
    } catch (cause) {
      toast.erreurDe(cause, "L'envoi a échoué. Vérifiez votre connexion et réessayez.")
      // Relancé pour que le formulaire conserve la saisie.
      throw cause
    }
  }

  if (numeroCree) {
    return (
      <div className="max-w-2xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden mt-8">
        <div className="bg-cesi-jaune border-b-4 border-black p-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Demande enregistrée</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-lg">
            Votre signalement porte le numéro <strong className="text-2xl font-black">n° {numeroCree}</strong>.
          </p>
          <p className="text-gray-600">
            Conservez ce numéro : il permet au service technique de retrouver votre demande.
            Vous serez recontacté par e-mail si des précisions sont nécessaires.
          </p>
          <button
            type="button"
            onClick={() => setNumeroCree(null)}
            className="bg-black text-white font-bold px-6 py-3 rounded hover:bg-gray-800 transition-colors"
          >
            Déclarer un autre incident
          </button>
        </div>
      </div>
    )
  }

  return <UserForm onSubmit={envoyer} isAdminContext={contexteAdmin} salleImposee={salleImposee} />
}
