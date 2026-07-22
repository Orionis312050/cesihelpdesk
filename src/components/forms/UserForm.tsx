import { useState, useEffect, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { helpdeskDataService } from '../../services/helpdeskData'
import type { FormData } from '../../types/helpdesk'
import { AutocompleteInput } from '../ui/AutocompleteInput'
import { Icons } from '../ui/Icons'

interface UserFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isAdminContext: boolean
}

const EMPTY_FORM: FormData = {
  name: '', email: '', room: '', types: [], title: '', comment: '', risk: false, photo: null
}

export const UserForm = ({ onSubmit, isAdminContext }: UserFormProps) => {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rooms, setRooms] = useState<string[]>([])
  const [incidentTypes, setIncidentTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedRooms, loadedTypes] = await Promise.all([
          helpdeskDataService.getRooms(),
          helpdeskDataService.getIncidentTypes(),
        ])
        setRooms(loadedRooms)
        setIncidentTypes(loadedTypes)
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type]
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.room || !formData.title) {
      alert("Veuillez remplir les champs obligatoires.")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData(EMPTY_FORM)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, photo: file.name })
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) setFormData({ ...formData, photo: e.dataTransfer.files[0].name })
  }

  return (
    <div className="max-w-3xl mx-auto bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden mt-8 mb-12">
      <div className="bg-[#FBE800] border-b-4 border-black p-6">
        <h2 className="text-3xl font-black uppercase tracking-tight">
          {isAdminContext ? 'Saisie Admin' : 'Déclarer un incident'}
        </h2>
        <p className="font-medium mt-2">Aidez-nous à maintenir le campus en parfait état.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-gray-200 pb-2">1. Vos informations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Nom & Prénom *</label>
              <input type="text" required className="w-full border-2 border-gray-200 rounded p-2 focus:border-black outline-none transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Email *</label>
              <input type="email" required className="w-full border-2 border-gray-200 rounded p-2 focus:border-black outline-none transition-colors" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-gray-200 pb-2">2. Localisation de l'incident</h3>
          <div>
            <label className="block text-sm font-bold mb-1">Salle concernée *</label>
            <AutocompleteInput value={formData.room} onChange={(val) => setFormData({...formData, room: val})} options={rooms} placeholder="Rechercher une salle..." disabled={loading} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-gray-200 pb-2">3. Nature de l'intervention</h3>

          <div>
            <label className="block text-sm font-bold mb-2">Type d'incident (plusieurs possibles)</label>
            {loading ? (
              <p className="text-gray-500">Chargement des types d'incident...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {incidentTypes.map(type => (
                  <label key={type} className="flex items-center p-2 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded mr-2" checked={formData.types.includes(type)} onChange={() => handleTypeChange(type)} />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Titre de l'intervention *</label>
            <input type="text" required placeholder="Ex: Vidéoprojecteur hors service" className="w-full border-2 border-gray-200 rounded p-2 focus:border-black outline-none transition-colors" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Commentaires (détails) *</label>
            <textarea required rows={4} className="w-full border-2 border-gray-200 rounded p-2 focus:border-black outline-none transition-colors" value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})}></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Joindre une photo (optionnel, sera compressée)</label>
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <Icons.Upload />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-black hover:underline focus-within:outline-none">
                    <span>{formData.photo ? `Fichier: ${formData.photo}` : 'Téléverser un fichier'}</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                  {!formData.photo && <p className="pl-1">ou glisser-déposer</p>}
                </div>
                {!formData.photo && <p className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <label className="flex items-start cursor-pointer">
            <input type="checkbox" className="mt-1 w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500" checked={formData.risk} onChange={e => setFormData({...formData, risk: e.target.checked})} />
            <div className="ml-3">
              <span className="block text-red-800 font-bold">Risque d'accident ou de blessure</span>
              <span className="block text-sm text-red-600 mt-1">Cochez cette case si la situation présente un danger immédiat pour les étudiants ou le personnel. Une alerte sera envoyée instantanément.</span>
            </div>
          </label>
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-black text-white text-lg font-bold py-4 rounded hover:bg-gray-800 transition-colors shadow-lg active:translate-y-1 disabled:opacity-60">
          {submitting ? 'ENVOI…' : 'SOUMETTRE LA DEMANDE'}
        </button>
      </form>
    </div>
  )
}
