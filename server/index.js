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

app.get('/api/scraper-script', (_, res) => {
  const scriptPath = path.resolve(__dirname, '../scrapper/transactions.js')
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
