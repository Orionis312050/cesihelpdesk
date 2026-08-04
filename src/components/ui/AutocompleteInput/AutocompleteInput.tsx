import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icons } from '../Icons/Icons'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
  /** Identifiant du champ, pour l'associer à son `<label>` */
  id?: string
  /** Marque le champ comme invalide pour les lecteurs d'écran */
  invalide?: boolean
  /** Identifiant du message d'erreur associé */
  descriptionId?: string
}

export const AutocompleteInput = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  invalide = false,
  descriptionId,
}: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const [surligne, setSurligne] = useState(-1)
  const genereId = useId()
  const champId = id ?? genereId
  const listeId = `${champId}-liste`
  const conteneurRef = useRef<HTMLDivElement>(null)

  // Resynchronise la saisie quand la valeur est imposée de l'extérieur (salle
  // pré-remplie depuis l'URL d'un QR code, réinitialisation après envoi).
  // Sans cela, l'état interne restait figé sur sa valeur initiale : le champ
  // s'affichait vide alors que la salle était bien sélectionnée.
  //
  // Ajustement pendant le rendu plutôt que dans un `useEffect` : React relance
  // immédiatement le rendu sans afficher l'état intermédiaire, là où un effet
  // provoquerait un affichage transitoire avec l'ancienne valeur.
  const [valeurPrecedente, setValeurPrecedente] = useState(value)
  if (value !== valeurPrecedente) {
    setValeurPrecedente(value)
    setSearch(value)
  }

  // Ferme la liste sur un clic extérieur. Le `onBlur` retardé précédent fermait
  // la liste au bout de 200 ms, y compris pendant une navigation au clavier.
  useEffect(() => {
    if (!isOpen) return
    const surClic = (evenement: MouseEvent) => {
      if (!conteneurRef.current?.contains(evenement.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', surClic)
    return () => document.removeEventListener('mousedown', surClic)
  }, [isOpen])

  const filtrees = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase()),
  )

  const choisir = (option: string) => {
    setSearch(option)
    onChange(option)
    setIsOpen(false)
    setSurligne(-1)
  }

  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault()
      if (!isOpen) { setIsOpen(true); return }
      const pas = evenement.key === 'ArrowDown' ? 1 : -1
      setSurligne(actuel => {
        const suivant = actuel + pas
        if (suivant < 0) return filtrees.length - 1
        if (suivant >= filtrees.length) return 0
        return suivant
      })
      return
    }

    if (evenement.key === 'Enter' && isOpen && surligne >= 0 && filtrees[surligne]) {
      // Empêche la soumission du formulaire : ici la touche Entrée valide
      // l'option surlignée.
      evenement.preventDefault()
      choisir(filtrees[surligne])
    }
  }

  return (
    <div className="relative" ref={conteneurRef}>
      <div className={`flex items-center border-2 rounded p-2 transition-colors bg-white ${invalide ? 'border-red-500' : 'border-gray-200 focus-within:border-black'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Icons.Search />
        <input
          id={champId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-invalid={invalide || undefined}
          aria-describedby={descriptionId}
          autoComplete="off"
          className="w-full ml-2 outline-none disabled:bg-white min-h-7"
          placeholder={placeholder}
          value={search}
          disabled={disabled}
          onChange={evenement => { setSearch(evenement.target.value); onChange(evenement.target.value); setIsOpen(true); setSurligne(-1) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={surTouche}
        />
      </div>

      {isOpen && filtrees.length > 0 && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute z-10 w-full bg-white border-2 border-t-0 border-black mt-1 max-h-60 overflow-y-auto rounded-b shadow-lg"
        >
          {filtrees.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === surligne}
              className={`p-3 cursor-pointer border-b last:border-b-0 border-gray-100 ${index === surligne ? 'bg-cesi-jaune' : 'hover:bg-cesi-jaune'}`}
              onMouseDown={() => choisir(option)}
              onMouseEnter={() => setSurligne(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
