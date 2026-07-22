import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
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

const mapTicket = (row) => ({
  id: row.id,
  date: new Date(row.created_at).toISOString().slice(0, 10),
  name: row.name,
  email: row.email,
  room: row.room,
  types: typeof row.types === 'string' ? JSON.parse(row.types) : row.types,
  title: row.title,
  comment: row.comment,
  risk: Boolean(row.risk),
  photo: row.photo,
  status: row.status,
  handler: row.handler,
  adminComment: row.admin_comment,
})

app.get('/api/tickets', async (_request, response, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC')
    response.json(rows.map(mapTicket))
  } catch (error) { next(error) }
})

app.post('/api/tickets', async (request, response, next) => {
  try {
    const { name, email, room, types, title, comment, risk, photo } = request.body
    if (!name || !email || !room || !title || !comment || !Array.isArray(types)) {
      return response.status(400).json({ error: 'Ticket invalide.' })
    }
    const id = `T-${randomUUID()}`
    await pool.execute(
      'INSERT INTO tickets (id, name, email, room, types, title, comment, risk, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, room, JSON.stringify(types), title, comment, Boolean(risk), photo ?? null],
    )
    const [rows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id])
    response.status(201).json(mapTicket(rows[0]))
  } catch (error) { next(error) }
})

app.patch('/api/tickets/:id', async (request, response, next) => {
  try {
    const columns = { status: 'status', handler: 'handler', adminComment: 'admin_comment' }
    const column = columns[request.body.field]
    if (!column || typeof request.body.value !== 'string') return response.status(400).json({ error: 'Mise à jour invalide.' })
    const [result] = await pool.execute(`UPDATE tickets SET ${column} = ? WHERE id = ?`, [request.body.value, request.params.id])
    if (!result.affectedRows) return response.status(404).json({ error: 'Ticket introuvable.' })
    response.status(204).end()
  } catch (error) { next(error) }
})

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
app.use(express.static(dist))
app.use((_request, response) => response.sendFile(path.join(dist, 'index.html')))
app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Erreur interne.' })
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`Serveur de production démarré sur le port ${port}`))
