/**
 * Service de stockage des photos d'incident (Supabase Storage).
 *
 * Le bucket `incidents` est **privé**. Une photo de salle peut montrer des
 * personnes ou du matériel : elle ne doit pas être accessible en devinant une
 * URL. La consultation passe donc par une URL signée à durée limitée, générée à
 * la demande pour le personnel connecté.
 *
 * La colonne `tickets.image_chemin` stocke le **chemin de l'objet**, jamais une
 * URL : une URL signée expire, et la fiche afficherait alors une image cassée.
 */

import { supabase } from '../lib/supabase'

/** Nom du bucket de stockage des photos. */
export const BUCKET_INCIDENTS = 'incidents'

/** Durée de validité d'une URL signée, en secondes (1 heure). */
const DUREE_URL_SIGNEE = 3600

export const storageService = {
  /**
   * Envoie une photo compressée dans le bucket.
   *
   * Le nom est tiré de `crypto.randomUUID()` : il ne doit rien révéler du
   * contenu ni permettre d'énumérer les fichiers voisins.
   *
   * @param fichier Image déjà compressée.
   * @returns Le chemin de l'objet, à stocker dans `tickets.image_chemin`.
   * @throws {Error} Si l'envoi échoue.
   *
   * @example
   * const chemin = await storageService.envoyerPhoto(compressee.fichier)
   * // '2026/a3f1c8e2-....jpg'
   */
  async envoyerPhoto(fichier: File): Promise<string> {
    const annee = new Date().getFullYear()
    const chemin = `${annee}/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from(BUCKET_INCIDENTS)
      .upload(chemin, fichier, { contentType: 'image/jpeg', upsert: false })

    if (error) throw new Error(`L’envoi de la photo a échoué : ${error.message}`)
    return chemin
  },

  /**
   * Génère une URL temporaire permettant d'afficher une photo.
   *
   * @param chemin Valeur de `tickets.image_chemin`.
   * @returns URL signée valable une heure, ou `null` si elle ne peut être générée.
   */
  async urlSignee(chemin: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET_INCIDENTS)
      .createSignedUrl(chemin, DUREE_URL_SIGNEE)

    if (error) return null
    return data.signedUrl
  },
}
