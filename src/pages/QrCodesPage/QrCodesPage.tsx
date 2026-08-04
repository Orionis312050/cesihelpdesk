import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { QrPoster } from '../../components/qr/QrPoster/QrPoster'
import { Icons } from '../../components/ui/Icons/Icons'
import { useToast } from '../../hooks/useToast'
import { helpdeskDataService } from '../../services/helpdeskData'
import { buildGenericReportUrl, buildReportUrl, origineApplication } from '../../utils/qr'
import styles from './QrCodesPage.module.css'

/** Ce qui doit partir à l'impression. */
type ModeImpression = 'generique' | 'salles'

/**
 * Génération des affiches à QR code.
 *
 * L'**affiche générique** est le cas d'usage principal : son QR code ouvre le
 * formulaire sans salle pré-remplie, et le déclarant choisit la localisation
 * dans la liste. Elle est donc mise en avant, avec son aperçu et son propre
 * bouton d'impression.
 *
 * Les **affiches par salle** restent disponibles dans un second temps : elles
 * évitent au déclarant de choisir, ce qui est utile pour une salle sensible ou
 * difficile à nommer. Elles sont repliées par défaut, et aucune n'est
 * sélectionnée — sans quoi chaque impression produirait une vingtaine de pages
 * non désirées.
 */
export const QrCodesPage = () => {
  const toast = useToast()
  const [salles, setSalles] = useState<string[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [modeImpression, setModeImpression] = useState<ModeImpression | null>(null)
  const [chargement, setChargement] = useState(true)
  const origine = origineApplication()

  useEffect(() => {
    helpdeskDataService.getRooms()
      .then(setSalles)
      .catch((cause: unknown) => toast.erreurDe(cause, 'Impossible de charger la liste des salles.'))
      .finally(() => setChargement(false))
  }, [toast])

  const affiches = useMemo(
    () => salles.filter(salle => selection.includes(salle)),
    [salles, selection],
  )

  const basculer = (salle: string) => {
    setSelection(actuelle =>
      actuelle.includes(salle) ? actuelle.filter(s => s !== salle) : [...actuelle, salle])
  }

  /**
   * Lance l'impression du jeu d'affiches demandé.
   *
   * `flushSync` est indispensable : `window.print()` est synchrone et
   * capturerait la page telle qu'elle est *avant* que React n'ait appliqué le
   * changement d'état. Sans cela, la première impression sortirait le mauvais
   * jeu d'affiches.
   */
  const imprimer = (mode: ModeImpression) => {
    flushSync(() => setModeImpression(mode))
    window.print()
    setModeImpression(null)
  }

  // Repère visible à l'écran uniquement : une affiche pointant vers localhost
  // serait inutilisable une fois collée dans un couloir.
  const origineLocale = /localhost|127\.0\.0\.1/.test(origine)

  return (
    <div className="space-y-6" data-impression={modeImpression ?? undefined}>
      <div className={styles.ecranSeulement}>
        <h1 className="text-2xl font-black uppercase tracking-tight">QR codes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Affiches à imprimer et à coller dans les locaux.
        </p>
      </div>

      {origineLocale && (
        <p role="alert" className={`${styles.ecranSeulement} bg-red-50 border-l-4 border-red-600 text-red-800 text-sm p-3 rounded`}>
          <strong>Ne pas imprimer en l'état.</strong> Les QR codes pointent vers <code>{origine}</code>,
          une adresse locale inaccessible depuis un téléphone. Renseignez
          <code> VITE_PUBLIC_APP_URL</code> avec l'adresse publique de l'application.
        </p>
      )}

      {/* ------------------------------------------------------------------
          Affiche générique — cas d'usage principal
      ------------------------------------------------------------------ */}
      <section className={styles.zoneGenerique}>
        <div className={`${styles.ecranSeulement} bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6 mb-4`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-64">
              <p className="inline-block bg-cesi-jaune border-2 border-black rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wide mb-2">
                Affiche principale
              </p>
              <h2 className="text-xl font-black uppercase tracking-tight">Affiche générique, sans salle</h2>
              <p className="text-sm text-gray-600 mt-2 max-w-prose">
                Une seule affiche, valable partout. Le déclarant choisit la salle dans
                la liste au moment du signalement — les filtres et les statistiques
                restent donc exploitables. À coller dans les couloirs, les escaliers,
                à l'accueil, ou en complément des affiches par salle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => imprimer('generique')}
              className="flex items-center gap-2 bg-black text-white px-5 py-3 min-h-11 rounded font-bold hover:bg-gray-800 transition-colors shrink-0"
            >
              <Icons.Print /> Imprimer cette affiche
            </button>
          </div>
        </div>

        <div className={styles.apercuGenerique}>
          <QrPoster url={buildGenericReportUrl(origine)} salle={null} />
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Affiches par salle — usage secondaire
      ------------------------------------------------------------------ */}
      <section className={styles.zoneSalles}>
        <details className={`${styles.ecranSeulement} bg-white rounded-xl shadow border border-gray-100 mb-4`}>
          <summary className="cursor-pointer p-4 font-bold select-none min-h-11 flex items-center">
            Affiches par salle
            <span className="ml-2 font-normal text-sm text-gray-600">
              {chargement ? '(chargement…)' : `— ${salles.length} salles disponibles`}
              {selection.length > 0 && `, ${selection.length} sélectionnée(s)`}
            </span>
          </summary>

          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600 mb-3 max-w-prose">
              Le QR code d'une salle la renseigne automatiquement : le déclarant n'a
              rien à choisir. Utile pour une salle sensible ou dont le nom prête à
              confusion.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => setSelection(salles)} className="text-sm border-2 border-black px-3 py-2 min-h-11 rounded font-bold hover:bg-gray-100">
                Tout sélectionner
              </button>
              <button type="button" onClick={() => setSelection([])} className="text-sm border-2 border-black px-3 py-2 min-h-11 rounded font-bold hover:bg-gray-100">
                Tout désélectionner
              </button>
              <button
                type="button"
                onClick={() => imprimer('salles')}
                disabled={affiches.length === 0}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 min-h-11 rounded text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Icons.Print /> Imprimer la sélection ({affiches.length})
              </button>
            </div>

            <fieldset className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
              <legend className="sr-only">Salles à imprimer</legend>
              {salles.map(salle => (
                <label key={salle} className="flex items-center gap-2 p-2 min-h-11 rounded hover:bg-gray-50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-black shrink-0"
                    checked={selection.includes(salle)}
                    onChange={() => basculer(salle)}
                  />
                  <span className="truncate" title={salle}>{salle}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </details>

        <div className={styles.grilleAffiches}>
          {affiches.map(salle => (
            <QrPoster key={salle} url={buildReportUrl(salle, origine)} salle={salle} />
          ))}
        </div>
      </section>
    </div>
  )
}
