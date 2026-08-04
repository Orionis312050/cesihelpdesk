/**
 * Export du tableau de suivi au format Excel (.xlsx).
 *
 * L'implémentation précédente produisait un CSV séparé par points-virgules,
 * nommé `.csv`, derrière un bouton « Exporter Excel ». Elle exportait les clés
 * techniques (`EN_COURS`) au lieu des libellés, et n'écrivait pas de marque
 * d'ordre des octets : Excel en français affichait « Ã‰lectricitÃ© ».
 *
 * Un vrai fichier `.xlsx` fait disparaître le problème d'encodage au lieu de le
 * contourner, et permet des colonnes réellement typées : les dates se trient
 * comme des dates, pas comme du texte.
 *
 * La bibliothèque est chargée dynamiquement : elle ne doit pas peser sur le
 * formulaire public, ouvert depuis un téléphone.
 */

import { STATUSES } from '../data/helpdesk'
import type { Ticket } from '../types/helpdesk'

/** Une ligne du fichier exporté, avant mise en forme. */
export interface LigneExport {
  numero: number
  date: Date
  titre: string
  salle: string
  types: string
  statut: string
  traitant: string
  risque: string
  demandeur: string
  email: string
  description: string
  commentaireAdmin: string
  resolule: Date | null
}

/**
 * Transforme les tickets en lignes prêtes à exporter.
 *
 * Séparée de l'écriture du fichier pour être testable sans manipuler de binaire.
 *
 * @param tickets Tickets à exporter (généralement la sélection filtrée).
 * @returns Lignes avec les libellés français attendus dans le fichier.
 *
 * @example
 * ticketsVersLignes([ticket])[0].statut // 'En cours' et non 'EN_COURS'
 */
export const ticketsVersLignes = (tickets: Ticket[]): LigneExport[] =>
  tickets.map(ticket => ({
    numero: Number(ticket.id),
    date: new Date(ticket.createdAt),
    titre: ticket.title,
    salle: ticket.room,
    types: ticket.types.join(', '),
    statut: STATUSES[ticket.status].label,
    traitant: ticket.handler || 'Non assigné',
    risque: ticket.risk ? 'Oui' : 'Non',
    demandeur: ticket.name,
    email: ticket.email,
    description: ticket.comment,
    commentaireAdmin: ticket.adminComment,
    resolule: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
  }))

/** Mise en forme de la ligne d'en-tête : jaune CESI, texte noir en gras. */
const STYLE_ENTETE = { fontWeight: 'bold', backgroundColor: '#FBE800', align: 'left' } as const

/**
 * Description des colonnes.
 *
 * `type` est renseigné pour chaque cellule : c'est ce qui fait qu'une date se
 * trie comme une date et qu'un numéro se trie comme un nombre. Un CSV ne peut
 * pas transmettre cette information.
 */
const colonnes = [
  { entete: 'N°', largeur: 8, cellule: (l: LigneExport) => ({ type: Number, value: l.numero }) },
  { entete: 'Date de déclaration', largeur: 20, cellule: (l: LigneExport) => ({ type: Date, value: l.date, format: 'dd/mm/yyyy hh:mm' }) },
  { entete: 'Titre', largeur: 38, cellule: (l: LigneExport) => ({ type: String, value: l.titre }) },
  { entete: 'Salle', largeur: 22, cellule: (l: LigneExport) => ({ type: String, value: l.salle }) },
  { entete: "Type(s) d'incident", largeur: 30, cellule: (l: LigneExport) => ({ type: String, value: l.types }) },
  { entete: 'Statut', largeur: 14, cellule: (l: LigneExport) => ({ type: String, value: l.statut }) },
  { entete: 'Traitant', largeur: 22, cellule: (l: LigneExport) => ({ type: String, value: l.traitant }) },
  { entete: 'Risque', largeur: 9, cellule: (l: LigneExport) => ({ type: String, value: l.risque }) },
  { entete: 'Demandeur', largeur: 22, cellule: (l: LigneExport) => ({ type: String, value: l.demandeur }) },
  { entete: 'Email', largeur: 28, cellule: (l: LigneExport) => ({ type: String, value: l.email }) },
  { entete: 'Description', largeur: 50, cellule: (l: LigneExport) => ({ type: String, value: l.description }) },
  { entete: 'Commentaire de suivi', largeur: 40, cellule: (l: LigneExport) => ({ type: String, value: l.commentaireAdmin }) },
  { entete: 'Résolu le', largeur: 16, cellule: (l: LigneExport) => ({ type: Date, value: l.resolule ?? undefined, format: 'dd/mm/yyyy' }) },
]

/** En-têtes du fichier exporté, dans l'ordre des colonnes. */
export const ENTETES_EXPORT = colonnes.map(colonne => colonne.entete)

/** Nom de fichier horodaté, ex. `CESI_Incidents_2026-08-05.xlsx`. */
export const nomFichierExport = (date: Date = new Date()): string =>
  `CESI_Incidents_${date.toISOString().slice(0, 10)}.xlsx`

/**
 * Génère et télécharge le fichier Excel des tickets fournis.
 *
 * @param tickets Tickets à exporter, dans l'ordre d'affichage.
 * @throws {Error} Si la génération échoue.
 *
 * @example
 * await exporterVersExcel(resultatsFiltres)
 */
export const exporterVersExcel = async (tickets: Ticket[]): Promise<void> => {
  // Sous-chemin `/browser` : le paquet n'expose pas de racine, et la variante
  // `/node` ferait entrer des modules Node dans le bundle du navigateur.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  // La variante navigateur renvoie `{ toBlob, toFile }` : c'est `toFile()` qui
  // déclenche le téléchargement.
  await writeXlsxFile(ticketsVersLignes(tickets), {
    columns: colonnes.map(colonne => ({
      header: { value: colonne.entete, ...STYLE_ENTETE },
      width: colonne.largeur,
      cell: colonne.cellule,
    })),
    sheet: 'Incidents',
    // Fige la ligne d'en-tête : sans cela, on perd le nom des colonnes dès
    // qu'on fait défiler quelques centaines de lignes.
    stickyRowsCount: 1,
  }).toFile(nomFichierExport())
}
