/**
 * Compression des photos d'incident dans le navigateur.
 *
 * Une photo prise au téléphone pèse 3 à 8 Mo. L'envoyer telle quelle depuis le
 * Wi-Fi d'une salle de cours est lent et remplit le stockage pour rien : une
 * photo de vidéoprojecteur cassé n'a pas besoin de 12 mégapixels.
 *
 * ATTENTION : cette compression est un confort d'usage, **pas** une mesure de
 * sécurité. Un client modifié peut envoyer ce qu'il veut. Les limites réelles
 * (taille, type MIME) sont posées sur le bucket Storage, côté serveur.
 */

/** Largeur ou hauteur maximale de l'image compressée, en pixels. */
export const TAILLE_MAX_PX = 1600

/** Qualité JPEG appliquée à la compression (0 à 1). */
export const QUALITE_JPEG = 0.8

/** Taille maximale acceptée pour le fichier d'origine (10 Mo). */
export const TAILLE_ORIGINE_MAX_OCTETS = 10 * 1024 * 1024

/** Types d'image acceptés. */
export const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/** Résultat d'une compression. */
export interface ImageCompressee {
  /** Fichier JPEG prêt à être envoyé */
  fichier: File
  /** Taille du fichier d'origine, en octets */
  tailleOrigine: number
  /** Taille après compression, en octets */
  tailleFinale: number
  /** URL locale (blob:) pour l'aperçu. À révoquer après usage. */
  apercu: string
}

/**
 * Calcule les dimensions cibles en préservant les proportions.
 *
 * Extrait de la manipulation du canvas pour rester testable sans navigateur.
 * Une image déjà plus petite que la limite n'est jamais agrandie.
 *
 * @param largeur Largeur d'origine en pixels.
 * @param hauteur Hauteur d'origine en pixels.
 * @param maxCote Longueur maximale du plus grand côté.
 * @returns Dimensions cibles, arrondies à l'entier.
 *
 * @example
 * computeTargetDimensions(4000, 3000, 1600) // { largeur: 1600, hauteur: 1200 }
 * computeTargetDimensions(800, 600, 1600)   // { largeur: 800, hauteur: 600 }
 */
export const computeTargetDimensions = (
  largeur: number,
  hauteur: number,
  maxCote: number = TAILLE_MAX_PX,
): { largeur: number; hauteur: number } => {
  const plusGrandCote = Math.max(largeur, hauteur)
  if (plusGrandCote <= maxCote || plusGrandCote === 0) {
    return { largeur: Math.round(largeur), hauteur: Math.round(hauteur) }
  }

  const facteur = maxCote / plusGrandCote
  return {
    largeur: Math.max(1, Math.round(largeur * facteur)),
    hauteur: Math.max(1, Math.round(hauteur * facteur)),
  }
}

/** Formate une taille en octets pour l'affichage (« 2,4 Mo »). */
export const formaterTaille = (octets: number): string => {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`
  return `${(octets / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

/**
 * Compresse une image sélectionnée par l'utilisateur.
 *
 * `createImageBitmap` est utilisé avec `imageOrientation: 'from-image'` : sans
 * cette option, les photos prises en mode portrait arrivent couchées, car
 * l'orientation EXIF n'est pas appliquée au dessin sur canvas.
 *
 * @param fichier Fichier choisi dans le champ de formulaire.
 * @returns L'image compressée, sa taille avant/après et une URL d'aperçu.
 * @throws {Error} Si le fichier n'est pas une image, s'il dépasse 10 Mo, ou si
 *   le navigateur ne parvient pas à le décoder.
 *
 * @example
 * const { fichier, tailleOrigine, tailleFinale } = await compresserImage(choisi)
 * // 3 145 728 octets -> 214 003 octets
 */
export const compresserImage = async (fichier: File): Promise<ImageCompressee> => {
  if (!fichier.type.startsWith('image/')) {
    throw new Error('Le fichier choisi n’est pas une image.')
  }

  if (fichier.size > TAILLE_ORIGINE_MAX_OCTETS) {
    throw new Error(`L’image dépasse ${formaterTaille(TAILLE_ORIGINE_MAX_OCTETS)}. Choisissez une photo plus légère.`)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Cette image n’a pas pu être lue. Essayez au format JPEG ou PNG.')
  }

  const { largeur, hauteur } = computeTargetDimensions(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur

  const contexte = canvas.getContext('2d')
  if (!contexte) {
    bitmap.close()
    throw new Error('Compression impossible : le navigateur a refusé le canvas.')
  }

  contexte.drawImage(bitmap, 0, 0, largeur, hauteur)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resoudre => {
    canvas.toBlob(resoudre, 'image/jpeg', QUALITE_JPEG)
  })

  if (!blob) throw new Error('Compression impossible : image non convertible en JPEG.')

  const nomSansExtension = fichier.name.replace(/\.[^./\\]+$/, '') || 'photo'

  return {
    fichier: new File([blob], `${nomSansExtension}.jpg`, { type: 'image/jpeg' }),
    tailleOrigine: fichier.size,
    tailleFinale: blob.size,
    apercu: URL.createObjectURL(blob),
  }
}
