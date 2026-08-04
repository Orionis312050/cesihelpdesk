import { useMemo, useState } from 'react'
import { BarChart } from '../../components/charts/BarChart/BarChart'
import { DonutChart } from '../../components/charts/DonutChart/DonutChart'
import { STATUSES, STATUS_ORDER } from '../../data/helpdesk'
import { useTickets } from '../../hooks/useTickets'
import { MOIS_COURTS, calculerStatistiques, formaterJours } from '../../utils/ticketStats'

interface CarteProps {
  libelle: string
  valeur: string | number
  precision?: string
  ton?: 'neutre' | 'jaune' | 'noir' | 'rouge'
}

const TONS: Record<NonNullable<CarteProps['ton']>, string> = {
  neutre: 'bg-white',
  jaune: 'bg-cesi-jaune',
  noir: 'bg-cesi-noir text-white',
  rouge: 'bg-red-700 text-white',
}

const Carte = ({ libelle, valeur, precision, ton = 'neutre' }: CarteProps) => (
  <div className={`${TONS[ton]} border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 rounded-xl`}>
    <p className={`font-bold text-sm ${ton === 'noir' || ton === 'rouge' ? 'text-gray-200' : 'text-gray-600'}`}>{libelle}</p>
    <p className="text-4xl font-black mt-1">{valeur}</p>
    {precision && (
      <p className={`text-xs mt-1 ${ton === 'noir' || ton === 'rouge' ? 'text-gray-300' : 'text-gray-500'}`}>{precision}</p>
    )}
  </div>
)

/** Tableau de bord statistique des incidents. */
export const StatsPage = () => {
  const { tickets, chargement } = useTickets()
  const [annee, setAnnee] = useState(() => new Date().getFullYear())

  const stats = useMemo(() => calculerStatistiques(tickets, annee), [tickets, annee])

  // L'année en cours est proposée même sans incident : sans cela, la liste
  // serait vide au démarrage d'une nouvelle année.
  const annees = useMemo(() => {
    const ensemble = new Set(stats.anneesDisponibles)
    ensemble.add(new Date().getFullYear())
    return [...ensemble].sort((a, b) => b - a)
  }, [stats.anneesDisponibles])

  const evolution = stats.septDerniersJours - stats.septJoursPrecedents

  if (chargement) {
    return (
      <div className="flex justify-center py-24" role="status" aria-live="polite">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">Calcul des statistiques…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-black uppercase tracking-tight">Statistiques</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="annee" className="text-sm font-bold">Année</label>
          <select
            id="annee"
            value={annee}
            onChange={e => setAnnee(Number(e.target.value))}
            className="border-2 border-black rounded px-3 py-2 min-h-11 font-bold bg-white"
          >
            {annees.map(valeur => <option key={valeur} value={valeur}>{valeur}</option>)}
          </select>
        </div>
      </div>

      {/* Les quatre statuts sont affichés séparément : « à traiter » et « en
          cours » recouvrent deux réalités bien différentes pour le service. */}
      <section aria-label="Indicateurs clés" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Carte libelle={`Incidents ${annee}`} valeur={stats.total} precision="déclarés sur l'année" />
        <Carte libelle="À traiter" valeur={stats.parStatut.NOUVEAU} precision="statut « Nouveau »" ton="jaune" />
        <Carte libelle="En cours" valeur={stats.parStatut.EN_COURS} precision={`${stats.parStatut.EN_ATTENTE} en attente`} />
        <Carte
          libelle="Alertes risque"
          valeur={stats.risques}
          precision={`${Math.round(stats.tauxRisque)} % des incidents`}
          ton={stats.risques > 0 ? 'rouge' : 'neutre'}
        />
      </section>

      <section aria-label="Indicateurs de délai" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Carte libelle="Délai moyen de résolution" valeur={formaterJours(stats.delaiMoyenResolution)} precision={`${stats.parStatut.TERMINE} incident(s) résolu(s)`} ton="noir" />
        <Carte libelle="Incidents ouverts" valeur={stats.ouverts} precision={`âge moyen ${formaterJours(stats.ageMoyenOuverts)}`} />
        <Carte libelle="Ouverts > 30 jours" valeur={stats.ouvertsAncien} precision="à relancer en priorité" />
        <Carte
          libelle="7 derniers jours"
          valeur={stats.septDerniersJours}
          precision={evolution === 0 ? 'stable' : `${evolution > 0 ? '+' : ''}${evolution} vs semaine précédente`}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Volume d'incidents ({annee})</h2>
          <BarChart
            valeurs={stats.volumeMensuel}
            etiquettes={MOIS_COURTS}
            titre={`Nombre d'incidents déclarés par mois en ${annee}`}
          />
        </section>

        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Répartition par type</h2>
          <DonutChart parts={stats.parType} titre={`Répartition des types d'incident en ${annee}`} />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Salles les plus touchées</h2>
          {stats.topSalles.length === 0 ? (
            <p className="text-gray-400 italic">Aucune donnée à afficher.</p>
          ) : (
            <ol className="space-y-3">
              {stats.topSalles.map((salle, rang) => (
                <li key={salle.libelle} className="flex items-center gap-3">
                  <span className="w-6 text-gray-400 font-black">{rang + 1}</span>
                  <span className="flex-1 truncate font-medium" title={salle.libelle}>{salle.libelle}</span>
                  <span className="w-32 bg-gray-100 rounded-full h-2.5 overflow-hidden" aria-hidden="true">
                    <span className="block h-full bg-cesi-noir rounded-full" style={{ width: `${salle.pourcentage}%` }} />
                  </span>
                  <span className="font-bold w-8 text-right">{salle.valeur}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Répartition par statut</h2>
          <ul className="space-y-3">
            {STATUS_ORDER.map(statut => {
              const valeur = stats.parStatut[statut]
              const pourcentage = stats.total === 0 ? 0 : (valeur / stats.total) * 100
              return (
                <li key={statut} className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full w-24 text-center ${STATUSES[statut].color}`}>
                    {STATUSES[statut].label}
                  </span>
                  <span className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden" aria-hidden="true">
                    <span className="block h-full bg-cesi-noir rounded-full" style={{ width: `${pourcentage}%` }} />
                  </span>
                  <span className="font-bold w-16 text-right">
                    {valeur} <span className="text-gray-400 text-xs">({Math.round(pourcentage)} %)</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
