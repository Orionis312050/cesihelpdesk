/**
 * Construction et lecture des liens encodés dans les QR codes des salles.
 *
 * Un QR code collé dans une salle encode une URL du type
 * `https://helpdesk.cesi.fr/salle/B204`. La scanner ouvre le formulaire de
 * déclaration avec la salle déjà renseignée.
 */

/**
 * Origine publique de l'application, utilisée dans les QR codes.
 *
 * Sans `VITE_PUBLIC_APP_URL`, on retomberait sur `window.location.origin`,
 * c'est-à-dire `http://localhost:5173` au moment où l'on imprime les affiches
 * depuis un poste de développement : les QR codes imprimés seraient inutilisables.
 */
export const origineApplication = (): string => {
  const configuree = import.meta.env.VITE_PUBLIC_APP_URL
  if (configuree) return configuree.replace(/\/+$/, '')
  return typeof window === 'undefined' ? '' : window.location.origin
}

/**
 * Construit l'URL à encoder dans le QR code d'une salle.
 *
 * @param salle Nom exact de la salle.
 * @param origine Origine à utiliser. Par défaut, celle de l'application.
 * @returns URL absolue vers le formulaire pré-rempli.
 *
 * @example
 * buildReportUrl('Salle Informatique 1', 'https://helpdesk.cesi.fr')
 * // 'https://helpdesk.cesi.fr/salle/Salle%20Informatique%201'
 */
export const buildReportUrl = (salle: string, origine: string = origineApplication()): string =>
  `${origine}/salle/${encodeURIComponent(salle)}`

/**
 * Construit l'URL de l'affiche générique, sans salle pré-remplie.
 *
 * Destinée aux lieux qui ne sont pas des salles — couloirs, escaliers, parvis,
 * parking — et aux affiches d'accueil. Le déclarant choisit lui-même la
 * localisation dans la liste.
 *
 * @param origine Origine à utiliser. Par défaut, celle de l'application.
 * @returns URL absolue vers le formulaire vierge.
 *
 * @example
 * buildGenericReportUrl('https://helpdesk.cesi.fr')
 * // 'https://helpdesk.cesi.fr/signaler'
 */
export const buildGenericReportUrl = (origine: string = origineApplication()): string =>
  `${origine}/signaler`

/**
 * Décode le nom de salle extrait de l'URL.
 *
 * React Router décode déjà les paramètres de route, mais les affiches plus
 * anciennes peuvent utiliser la forme `?salle=…`. On tolère les deux et on
 * décode défensivement : un `%` isolé dans une URL tronquée ferait lever
 * `decodeURIComponent`.
 *
 * @param brut Valeur issue du paramètre de route ou de la chaîne de requête.
 * @returns Nom de salle nettoyé, ou une chaîne vide.
 *
 * @example
 * parseRoomParam('Salle%20Informatique%201') // 'Salle Informatique 1'
 * parseRoomParam(undefined)                  // ''
 */
export const parseRoomParam = (brut: string | undefined | null): string => {
  if (!brut) return ''
  try {
    return decodeURIComponent(brut).trim()
  } catch {
    return brut.trim()
  }
}
