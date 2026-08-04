import type { Part } from '../../../utils/ticketStats'

interface DonutChartProps {
  /** Parts à représenter, déjà triées */
  parts: Part[]
  /** Description accessible du graphique */
  titre: string
}

/**
 * Palette du graphique.
 *
 * Le jaune CESI d'abord, puis des teintes nettement distinctes. Les couleurs
 * sont choisies pour rester différenciables en niveaux de gris à l'impression
 * et par les principales formes de daltonisme.
 */
const COULEURS = ['#FBE800', '#1A1A1A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280']

const RAYON = 70
const EPAISSEUR = 26
const CIRCONFERENCE = 2 * Math.PI * RAYON

/**
 * Anneau de répartition, dessiné en SVG.
 *
 * Construit avec `stroke-dasharray` sur des cercles concentriques plutôt qu'avec
 * un `conic-gradient` CSS : le SVG s'imprime correctement et expose un vrai
 * équivalent textuel.
 */
export const DonutChart = ({ parts, titre }: DonutChartProps) => {
  if (parts.length === 0) {
    return <p className="text-gray-400 italic text-center py-12">Aucune donnée à afficher.</p>
  }

  // Décalage cumulé de chaque segment, calculé d'avance : accumuler dans une
  // variable mutable pendant le `map` de rendu est fragile (React peut réexécuter
  // le rendu) et interdit par la règle de lint `react-hooks/immutability`.
  const segments = parts.reduce<{ part: Part; debut: number }[]>((acc, part) => {
    const precedent = acc.at(-1)
    const debut = precedent ? precedent.debut + precedent.part.pourcentage : 0
    return [...acc, { part, debut }]
  }, [])

  return (
    <figure className="m-0 flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 180 180" className="w-44 h-44 shrink-0 -rotate-90" role="img" aria-label={titre}>
        {segments.map(({ part, debut }, index) => {
          const longueur = (part.pourcentage / 100) * CIRCONFERENCE
          return (
            <circle
              key={part.libelle}
              cx="90"
              cy="90"
              r={RAYON}
              fill="none"
              stroke={COULEURS[index % COULEURS.length]}
              strokeWidth={EPAISSEUR}
              strokeDasharray={`${longueur} ${CIRCONFERENCE - longueur}`}
              strokeDashoffset={-(debut / 100) * CIRCONFERENCE}
            >
              <title>{`${part.libelle} : ${part.valeur}`}</title>
            </circle>
          )
        })}
      </svg>

      <ul className="flex-1 w-full space-y-1.5 text-sm max-h-48 overflow-y-auto">
        {parts.map((part, index) => (
          <li key={part.libelle} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full shrink-0 border border-gray-300"
              style={{ backgroundColor: COULEURS[index % COULEURS.length] }}
            />
            <span className="truncate flex-1" title={part.libelle}>{part.libelle}</span>
            <span className="font-bold text-gray-600 text-xs whitespace-nowrap">
              {part.valeur} ({Math.round(part.pourcentage)} %)
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
