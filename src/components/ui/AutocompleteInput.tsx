import { useState } from 'react'
import { Icons } from './Icons'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
}

export const AutocompleteInput = ({ value, onChange, options, placeholder, disabled = false }: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative">
      <div className={`flex items-center border-2 border-gray-200 rounded p-2 focus-within:border-black transition-colors bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Icons.Search />
        <input
          type="text"
          className="w-full ml-2 outline-none disabled:bg-white"
          placeholder={placeholder}
          value={search}
          disabled={disabled}
          onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border-2 border-t-0 border-black mt-1 max-h-48 overflow-y-auto rounded-b shadow-lg">
          {filteredOptions.map((opt) => (
            <li
              key={opt}
              className="p-2 hover:bg-[#FBE800] cursor-pointer border-b last:border-b-0 border-gray-100"
              onMouseDown={() => { setSearch(opt); onChange(opt); setIsOpen(false) }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
