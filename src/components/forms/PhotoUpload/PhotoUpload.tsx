import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { compresserImage, formaterTaille, type ImageCompressee } from '../../../utils/imageCompression'
import { Icons } from '../../ui/Icons/Icons'

interface PhotoUploadProps {
  /** Image compressée actuellement sélectionnée, `null` si aucune */
  valeur: ImageCompressee | null
  /** Appelé après compression, ou avec `null` quand la photo est retirée */
  onChange: (image: ImageCompressee | null) => void
}

/**
 * Champ d'ajout de photo, avec compression dans le navigateur.
 *
 * La compression est faite dès la sélection, pour pouvoir annoncer le gain de
 * poids ; l'envoi vers le stockage n'a lieu qu'à la validation du formulaire.
 * Envoyer immédiatement laisserait des fichiers orphelins pour chaque
 * formulaire abandonné, et imposerait d'ouvrir un droit de suppression anonyme.
 */
export const PhotoUpload = ({ valeur, onChange }: PhotoUploadProps) => {
  const [glisse, setGlisse] = useState(false)
  const [traitement, setTraitement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const champRef = useRef<HTMLInputElement>(null)

  // Les URL d'aperçu (blob:) restent en mémoire tant qu'elles ne sont pas
  // révoquées : sans ce nettoyage, chaque photo essayée fuite.
  useEffect(() => {
    const apercu = valeur?.apercu
    return () => { if (apercu) URL.revokeObjectURL(apercu) }
  }, [valeur?.apercu])

  const traiter = async (fichier: File | undefined) => {
    if (!fichier) return
    setErreur(null)
    setTraitement(true)
    try {
      onChange(await compresserImage(fichier))
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'Cette image n’a pas pu être traitée.')
      onChange(null)
    } finally {
      setTraitement(false)
    }
  }

  const surSelection = (evenement: ChangeEvent<HTMLInputElement>) => {
    void traiter(evenement.target.files?.[0])
  }

  const surDepot = (evenement: DragEvent<HTMLDivElement>) => {
    evenement.preventDefault()
    setGlisse(false)
    void traiter(evenement.dataTransfer.files[0])
  }

  const retirer = () => {
    onChange(null)
    setErreur(null)
    if (champRef.current) champRef.current.value = ''
  }

  return (
    <div>
      <label htmlFor="photo-incident" className="block text-sm font-bold mb-1">
        Joindre une photo <span className="font-normal text-gray-500">(facultatif)</span>
      </label>

      {valeur ? (
        <div className="flex items-center gap-4 border-2 border-gray-200 rounded p-3">
          <img
            src={valeur.apercu}
            alt="Aperçu de la photo jointe"
            className="w-24 h-24 object-cover rounded border border-gray-200 shrink-0"
          />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-bold truncate">{valeur.fichier.name}</p>
            <p className="text-gray-600">
              {formaterTaille(valeur.tailleOrigine)} → <strong>{formaterTaille(valeur.tailleFinale)}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">Compressée automatiquement avant envoi.</p>
          </div>
          <button
            type="button"
            onClick={retirer}
            className="shrink-0 min-w-11 min-h-11 flex items-center justify-center rounded border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Retirer la photo"
          >
            <Icons.Close />
          </button>
        </div>
      ) : (
        <div
          className={`mt-1 flex justify-center px-6 py-6 border-2 border-dashed rounded-md transition-colors ${glisse ? 'border-black bg-gray-50' : 'border-gray-300'}`}
          onDragOver={evenement => { evenement.preventDefault(); setGlisse(true) }}
          onDragLeave={() => setGlisse(false)}
          onDrop={surDepot}
        >
          <div className="space-y-1 text-center">
            <Icons.Upload />
            <div className="flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="photo-incident"
                className="relative cursor-pointer rounded font-medium text-black underline hover:no-underline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-black"
              >
                <span>{traitement ? 'Compression en cours…' : 'Choisir une photo'}</span>
                <input
                  id="photo-incident"
                  ref={champRef}
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  // Sur mobile, ouvre directement l'appareil photo arrière :
                  // « scanner le QR code puis photographier la panne » tient
                  // alors en deux gestes.
                  capture="environment"
                  onChange={surSelection}
                  disabled={traitement}
                />
              </label>
              <p className="pl-1 hidden sm:block">ou glisser-déposer</p>
            </div>
            <p className="text-xs text-gray-500">JPG, PNG ou WebP — 10 Mo maximum</p>
          </div>
        </div>
      )}

      {erreur && <p role="alert" className="mt-2 text-sm text-red-700 font-medium">{erreur}</p>}
    </div>
  )
}
