/**
 * Recule une date d'un nombre de mois, à la manière de
 * `now() - interval 'N months'` en PostgreSQL : si le jour n'existe pas dans le
 * mois cible, il est ramené au dernier jour de ce mois (31 août − 6 mois →
 * 28 février, et non 3 mars). Le calcul se fait en UTC, l'heure est conservée.
 *
 * @param date Date de départ, non modifiée.
 * @param mois Nombre de mois à retrancher, entier positif.
 * @returns Une nouvelle date.
 */
export const reculerDeMois = (date: Date, mois: number): Date => {
  const jour = date.getUTCDate()
  const resultat = new Date(date.getTime())
  // Passer par le 1er évite qu'un 31 déborde sur le mois suivant pendant le
  // changement de mois.
  resultat.setUTCDate(1)
  resultat.setUTCMonth(resultat.getUTCMonth() - mois)
  const dernierJour = new Date(Date.UTC(resultat.getUTCFullYear(), resultat.getUTCMonth() + 1, 0)).getUTCDate()
  resultat.setUTCDate(Math.min(jour, dernierJour))
  return resultat
}
