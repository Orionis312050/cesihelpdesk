import { QRCodeSVG } from 'qrcode.react'
import styles from './QrPoster.module.css'

interface QrPosterProps {
  /** Adresse encodée dans le QR code */
  url: string
  /** Nom de la salle, ou `null` pour l'affiche générique */
  salle: string | null
}

/**
 * Affiche imprimable portant le QR code d'une salle.
 *
 * Deux variantes :
 * - **par salle** : la salle est pré-remplie au scan, le déclarant n'a rien à
 *   choisir — c'est ce qui supprime la principale source d'erreur de saisie ;
 * - **générique** (`salle` à `null`) : pour les lieux qui ne sont pas des salles
 *   (couloirs, escaliers, extérieurs) et les affiches d'accueil. Le déclarant
 *   choisit la localisation lui-même.
 */
export const QrPoster = ({ url, salle }: QrPosterProps) => {
  const generique = salle === null

  return (
    <section className={styles.affiche}>
      <div className={styles.entete}>
        <span className={styles.logo}>CESI</span>
        <span className={styles.marque}>HELP DESK</span>
      </div>

      <p className={styles.consigne}>
        {generique ? 'Un problème sur le campus ?' : 'Un problème dans cette salle ?'}
      </p>

      <QRCodeSVG value={url} size={220} level="M" marginSize={2} className={styles.qr} />

      <p className={generique ? styles.salleGenerique : styles.salle}>
        {generique ? 'Signalez-le' : salle}
      </p>

      <p className={styles.instruction}>
        {generique
          ? 'Scannez ce code avec votre téléphone pour signaler un incident. Indiquez la localisation dans le formulaire.'
          : 'Scannez ce code avec votre téléphone pour signaler un incident. La salle sera automatiquement renseignée.'}
      </p>

      <p className={styles.url}>{url}</p>
    </section>
  )
}
