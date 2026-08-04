import { useEffect, useId, useRef, useState } from 'react'

interface MultiSelectProps {
  /** Libellé accessible du filtre */
  label: string
  /** Valeurs proposées */
  options: string[]
  /** Valeurs actuellement retenues */
  valeurs: string[]
  onChange: (valeurs: string[]) => void
  /** Libellé affiché pour une option vide (ex. « Non assigné ») */
  libelleVide?: string
}

/**
 * Filtre à choix multiple pour une colonne du tableau de suivi.
 *
 * Un `<select multiple>` natif oblige à maintenir Ctrl enfoncé pour
 * sélectionner plusieurs valeurs : très peu de monde le sait, et c'est
 * inutilisable au doigt. On utilise donc des cases à cocher dans un panneau.
 */
export const MultiSelect = ({ label, options, valeurs, onChange, libelleVide = '(vide)' }: MultiSelectProps) => {
  const [ouvert, setOuvert] = useState(false)
  const conteneurRef = useRef<HTMLDivElement>(null)
  const panneauId = useId()

  useEffect(() => {
    if (!ouvert) return
    const surClic = (evenement: MouseEvent) => {
      if (!conteneurRef.current?.contains(evenement.target as Node)) setOuvert(false)
    }
    const surEchap = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', surClic)
    document.addEventListener('keydown', surEchap)
    return () => {
      document.removeEventListener('mousedown', surClic)
      document.removeEventListener('keydown', surEchap)
    }
  }, [ouvert])

  const basculer = (option: string) => {
    onChange(valeurs.includes(option) ? valeurs.filter(v => v !== option) : [...valeurs, option])
  }

  const resume = valeurs.length === 0
    ? 'Tous'
    : valeurs.length === 1
      ? (valeurs[0] || libelleVide)
      : `${valeurs.length} sélectionnés`

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        aria-controls={panneauId}
        aria-label={`Filtrer par ${label}`}
        className={`w-full text-left text-xs border rounded px-2 py-1.5 min-h-9 bg-white truncate transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black ${
          valeurs.length ? 'border-black font-bold' : 'border-gray-300 text-gray-600'
        }`}
        title={valeurs.length ? valeurs.map(v => v || libelleVide).join(', ') : `Filtrer par ${label}`}
      >
        {resume} <span aria-hidden="true" className="float-right">▾</span>
      </button>

      {ouvert && (
        <div
          id={panneauId}
          className="absolute z-30 mt-1 w-56 max-h-64 overflow-y-auto bg-white border-2 border-black rounded shadow-lg p-1"
        >
          {valeurs.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left text-xs px-2 py-2 font-bold underline hover:bg-gray-100 rounded"
            >
              Tout désélectionner
            </button>
          )}
          {options.length === 0 && <p className="text-xs text-gray-500 p-2">Aucune valeur</p>}
          {options.map(option => (
            <label key={option || '__vide__'} className="flex items-center gap-2 text-xs px-2 py-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-black"
                checked={valeurs.includes(option)}
                onChange={() => basculer(option)}
              />
              <span className="truncate" title={option || libelleVide}>{option || libelleVide}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
