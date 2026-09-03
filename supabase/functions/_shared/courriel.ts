/**
 * Transport d'envoi des e-mails.
 *
 * Deux modes, choisis par le secret `MAIL_TRANSPORT` :
 *
 * - `console` (par défaut) : le message est écrit dans les journaux de la
 *   fonction, sans être envoyé. Permet de développer et de démontrer toute la
 *   chaîne (déclencheur, destinataires, gabarit, planification) **avant** que
 *   le service informatique du CESI n'ait fourni les identifiants SMTP.
 * - `smtp` : envoi réel via le relais SMTP de l'établissement.
 *
 * Passer de l'un à l'autre ne demande aucune modification de code, seulement
 * `supabase secrets set MAIL_TRANSPORT=smtp`.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

/** Message à envoyer. */
export interface Message {
  destinataires: string[]
  sujet: string
  html: string
  texte: string
}

/** Résultat d'un envoi, journalisé dans `email_log`. */
export interface ResultatEnvoi {
  statut: 'envoye' | 'echec' | 'simule'
  erreur?: string
}

const secret = (nom: string, defaut = ''): string => Deno.env.get(nom) ?? defaut

/**
 * Découpe une liste de destinataires séparés par des virgules ou des
 * points-virgules, en ignorant les entrées vides.
 */
export const listerDestinataires = (brut: string): string[] =>
  brut.split(/[,;]/).map(adresse => adresse.trim()).filter(Boolean)

/**
 * Envoie un message selon le transport configuré.
 *
 * Ne lève jamais d'exception : un incident déclaré ne doit pas échouer parce
 * que le serveur de messagerie est indisponible. L'échec est renvoyé pour être
 * journalisé.
 *
 * @param message Message à envoyer.
 * @returns Le statut de l'envoi.
 */
export const envoyer = async (message: Message): Promise<ResultatEnvoi> => {
  if (message.destinataires.length === 0) {
    return { statut: 'echec', erreur: 'Aucun destinataire configuré.' }
  }

  const transport = secret('MAIL_TRANSPORT', 'console')

  if (transport !== 'smtp') {
    console.log('[courriel:simule] ------------------------------------------')
    console.log('[courriel:simule] À      :', message.destinataires.join(', '))
    console.log('[courriel:simule] Sujet  :', message.sujet)
    console.log('[courriel:simule] Corps  :\n' + message.texte)
    console.log('[courriel:simule] ------------------------------------------')
    return { statut: 'simule' }
  }

  const hote = secret('SMTP_HOST')
  const port = Number(secret('SMTP_PORT', '587'))
  const utilisateur = secret('SMTP_USER')
  const motDePasse = secret('SMTP_PASSWORD')
  const adresseExpediteur = secret('SMTP_FROM', utilisateur)

  // Nom affiché : une alerte « risque d'accident » doit être identifiable d'un
  // coup d'œil dans une boîte encombrée. Sans ce nom, seule l'adresse technique
  // du relais s'affiche.
  const nomExpediteur = secret('SMTP_SENDER_NAME')
  const expediteur = nomExpediteur ? `${nomExpediteur} <${adresseExpediteur}>` : adresseExpediteur

  if (!hote || !utilisateur || !motDePasse) {
    return { statut: 'echec', erreur: 'Transport SMTP demandé mais SMTP_HOST / SMTP_USER / SMTP_PASSWORD manquent.' }
  }

  // `supabase-mail` est le service factice du .env amont de la pile self-hosted :
  // la variable existe, le conteneur non. Sans ce contrôle, l'échec remonte sous
  // forme d'erreur de résolution DNS, difficile à rattacher à sa cause.
  if (hote === 'supabase-mail') {
    return {
      statut: 'echec',
      erreur: "SMTP_HOST vaut « supabase-mail » : service inexistant dans la pile autohébergée. Lancez deploy/scripts/basculer-smtp.sh.",
    }
  }

  const client = new SMTPClient({
    connection: {
      hostname: hote,
      port,
      // Le port 465 est chiffré dès la connexion ; 587 démarre en clair puis
      // bascule en TLS via STARTTLS.
      tls: port === 465,
      auth: { username: utilisateur, password: motDePasse },
    },
  })

  // Un relais qui ne répond plus après la connexion laisserait `send()` en
  // attente indéfiniment, et l'appel de la base avec lui. On borne l'attente :
  // au-delà, c'est un échec journalisé, pas une requête qui pend.
  let minuteur: number | undefined
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new Error('Délai SMTP dépassé (30 s).')), 30_000)
  })

  try {
    await Promise.race([
      client.send({
        from: expediteur,
        to: message.destinataires,
        subject: message.sujet,
        content: message.texte,
        html: message.html,
      }),
      delai,
    ])
    return { statut: 'envoye' }
  } catch (cause) {
    return { statut: 'echec', erreur: cause instanceof Error ? cause.message : String(cause) }
  } finally {
    clearTimeout(minuteur)
    // `close()` peut lever, ou ne rien renvoyer du tout, si la connexion est
    // déjà tombée. Sans ce filet, l'erreur de fermeture masquerait la vraie.
    try {
      await client.close()
    } catch {
      // connexion déjà fermée : rien à faire
    }
  }
}
