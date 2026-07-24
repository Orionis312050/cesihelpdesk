import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

dotenv.config({ path: ['.env.production', '.env'] })

const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
const missing = required.filter((key) => !process.env[key])
if (missing.length) throw new Error(`Variables MySQL manquantes : ${missing.join(', ')}`)

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
})

const app = express()
app.use(express.json({ limit: '1mb' }))

const statusFromDatabase = (value) => {
  const normalized = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized === 'en cours') return 'EN_COURS'
  if (normalized === 'en attente') return 'EN_ATTENTE'
  if (normalized === 'termine') return 'TERMINE'
  return 'NOUVEAU'
}

const statusToDatabase = {
  NOUVEAU: 'nouveau',
  EN_COURS: 'en cours',
  EN_ATTENTE: 'en attente',
  TERMINE: 'terminé',
}

const ticketQuery = `
  SELECT
    t.*,
    s.nom AS salle_nom,
    u.nom_complet AS technicien_nom,
    COALESCE((
      SELECT JSON_ARRAYAGG(ci.label)
      FROM ticket_categories tc
      JOIN categories_incident ci ON ci.id = tc.category_id
      WHERE tc.ticket_id = t.id
    ), JSON_ARRAY()) AS categories
  FROM tickets t
  LEFT JOIN salles s ON s.id = t.salle_id
  LEFT JOIN utilisateurs u ON u.id = t.assigne_a_id
`

const parseCategories = (categories) => {
  if (Array.isArray(categories)) return categories
  if (typeof categories === 'string') return JSON.parse(categories)
  return []
}

const mapTicket = (row) => ({
  id: String(row.id),
  date: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  name: row.demandeur_nom,
  email: row.demandeur_email,
  room: row.salle_nom ?? '',
  types: parseCategories(row.categories),
  title: row.titre,
  comment: row.description ?? '',
  risk: Boolean(row.risque_accident),
  photo: row.image_url,
  status: statusFromDatabase(row.statut),
  handler: row.technicien_nom ?? '',
  adminComment: row.commentaire_admin ?? '',
})

const getTicket = async (connection, id) => {
  const [rows] = await connection.execute(`${ticketQuery} WHERE t.id = ?`, [id])
  return rows[0] ? mapTicket(rows[0]) : null
}

app.get('/api/helpdesk/rooms', async (_request, response, next) => {
  try {
    const [rows] = await pool.query('SELECT nom FROM salles ORDER BY nom')
    response.json(rows.map((row) => row.nom))
  } catch (error) { next(error) }
})

app.get('/api/helpdesk/incident-types', async (_request, response, next) => {
  try {
    const [rows] = await pool.query('SELECT label FROM categories_incident ORDER BY label')
    response.json(rows.map((row) => row.label))
  } catch (error) { next(error) }
})

app.get('/api/tickets', async (_request, response, next) => {
  try {
    const [rows] = await pool.query(`${ticketQuery} ORDER BY t.created_at DESC`)
    response.json(rows.map(mapTicket))
  } catch (error) { next(error) }
})

app.post('/api/tickets', async (request, response, next) => {
  const { name, email, room, types, title, comment, risk, photo } = request.body
  if (![name, email, room, title, comment].every((value) => typeof value === 'string' && value.trim()) ||
      !Array.isArray(types) || !types.every((value) => typeof value === 'string')) {
    return response.status(400).json({ error: 'Ticket invalide.' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [rooms] = await connection.execute('SELECT id FROM salles WHERE nom = ? LIMIT 1', [room])
    if (!rooms[0]) {
      await connection.rollback()
      return response.status(400).json({ error: `La salle « ${room} » n'existe pas.` })
    }

    const uniqueTypes = [...new Set(types)]
    let categoryIds = []
    if (uniqueTypes.length) {
      const placeholders = uniqueTypes.map(() => '?').join(', ')
      const [categories] = await connection.execute(
        `SELECT id, label FROM categories_incident WHERE label IN (${placeholders})`,
        uniqueTypes,
      )
      if (categories.length !== uniqueTypes.length) {
        await connection.rollback()
        return response.status(400).json({ error: "Un ou plusieurs types d'incident sont inconnus." })
      }
      categoryIds = categories.map((category) => category.id)
    }

    const [result] = await connection.execute(
      `INSERT INTO tickets
        (demandeur_nom, demandeur_email, salle_id, titre, description, image_url, risque_accident, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'nouveau')`,
      [name.trim(), email.trim(), rooms[0].id, title.trim(), comment.trim(), photo || null, Boolean(risk)],
    )

    for (const categoryId of categoryIds) {
      await connection.execute(
        'INSERT INTO ticket_categories (ticket_id, category_id) VALUES (?, ?)',
        [result.insertId, categoryId],
      )
    }

    const ticket = await getTicket(connection, result.insertId)
    await connection.commit()
    response.status(201).json(ticket)
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
})

app.patch('/api/tickets/:id', async (request, response, next) => {
  const { field, value } = request.body
  if (!Number.isInteger(Number(request.params.id)) || typeof value !== 'string') {
    return response.status(400).json({ error: 'Mise à jour invalide.' })
  }

  try {
    let result
    if (field === 'status') {
      const status = statusToDatabase[value]
      if (!status) return response.status(400).json({ error: 'Statut invalide.' })
      ;[result] = await pool.execute('UPDATE tickets SET statut = ? WHERE id = ?', [status, request.params.id])
    } else if (field === 'adminComment') {
      ;[result] = await pool.execute('UPDATE tickets SET commentaire_admin = ? WHERE id = ?', [value, request.params.id])
    } else if (field === 'handler') {
      let userId = null
      if (value.trim()) {
        const [users] = await pool.execute('SELECT id FROM utilisateurs WHERE nom_complet = ? LIMIT 1', [value.trim()])
        if (!users[0]) return response.status(400).json({ error: `L'utilisateur « ${value} » n'existe pas.` })
        userId = users[0].id
      }
      ;[result] = await pool.execute('UPDATE tickets SET assigne_a_id = ? WHERE id = ?', [userId, request.params.id])
    } else {
      return response.status(400).json({ error: 'Champ non modifiable.' })
    }

    if (!result.affectedRows) return response.status(404).json({ error: 'Ticket introuvable.' })
    response.status(204).end()
  } catch (error) { next(error) }
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'Route API introuvable.' }))

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
app.use(express.static(dist))
app.use((_request, response) => response.sendFile(path.join(dist, 'index.html')))
app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Erreur interne.' })
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`Serveur de production démarré sur le port ${port}`))
