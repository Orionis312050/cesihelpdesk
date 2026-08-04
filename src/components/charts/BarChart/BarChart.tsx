interface BarChartProps {
  /** Valeur de chaque barre */
  valeurs: number[]
  /** Étiquette de chaque barre, même longueur que `valeurs` */
  etiquettes: string[]
  /** Description accessible du graphique */
  titre: string
}

/**
 * Histogramme vertical, dessiné en SVG.
 *
 * Aucune bibliothèque de graphiques : deux graphiques ne justifient pas 40 à
 * 90 Ko compressés, et le cahier des charges insiste sur « Light/Simple, épuré ».
 * Le rendu SVG s'imprime proprement, contrairement à un canvas.
 */
export const BarChart = ({ valeurs, etiquettes, titre }: BarChartProps) => {
  const maximum = Math.max(...valeurs, 1)
  const largeurBarre = 100 / valeurs.length

  return (
    <figure className="m-0">
      <div className="h-56 flex items-end gap-1" role="img" aria-label={titre}>
        {valeurs.map((valeur, index) => (
          <div key={etiquettes[index]} className="flex-1 flex flex-col items-center justify-end h-full group">
            <span className="text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {valeur}
            </span>
            <div
              className="w-full bg-cesi-noir rounded-t transition-all duration-500 group-hover:bg-cesi-jaune"
              style={{
                height: `${(valeur / maximum) * 100}%`,
                minHeight: valeur > 0 ? '3px' : '0',
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-t border-gray-200 pt-2">
        {etiquettes.map(etiquette => (
          <div key={etiquette} className="flex-1 text-[10px] sm:text-xs text-gray-500 text-center truncate" style={{ maxWidth: `${largeurBarre}%` }}>
            {etiquette}
          </div>
        ))}
      </div>

      {/* Équivalent textuel : un graphique en barres est illisible au lecteur d'écran. */}
      <figcaption className="sr-only">
        {etiquettes.map((etiquette, index) => `${etiquette} : ${valeurs[index]}`).join(', ')}
      </figcaption>
    </figure>
  )
}
