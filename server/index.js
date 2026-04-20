const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }))
app.use(express.json({ limit: '50mb' }))

app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/pins', require('./routes/pins'))

const BACKUP_BASE_URL = process.env.BACKUP_BASE_URL || 'http://zima.local:6906'

app.get('/api/backup-profiles', async (req, res) => {
  try {
    const r = await fetch(`${BACKUP_BASE_URL}/api/profiles`)
    if (!r.ok) return res.status(502).json({ error: `Backup returned ${r.status}` })
    const profiles = await r.json()
    res.json(profiles.map(p => p.name))
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

app.post('/api/transactions/backup', (req, res) => {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../data')
  try {
    const rows = require('./db').prepare('SELECT raw FROM transactions ORDER BY created_at DESC').all()
    const data = rows.map(r => JSON.parse(r.raw))
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(dataDir, `backup_${stamp}.json`)
    fs.writeFileSync(file, JSON.stringify(data))
    res.json({ ok: true, file: path.basename(file), count: data.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/scraper-script', (_, res) => {
  const scriptPath = path.resolve(__dirname, 'scrapper/transactions.js')
  try {
    const script = fs.readFileSync(scriptPath, 'utf8')
    res.type('text/plain').send(script)
  } catch (e) {
    res.status(500).json({ error: 'Could not read scraper script' })
  }
})

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
