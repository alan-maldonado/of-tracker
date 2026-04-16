const { Router } = require('express')
const db = require('../db')

const router = Router()

// GET /api/pins — list pinned usernames
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT username FROM pins ORDER BY pinned_at ASC').all()
  res.json(rows.map(r => r.username))
})

// POST /api/pins/:username — pin a creator
router.post('/:username', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO pins (username) VALUES (?)').run(req.params.username)
  res.json({ ok: true })
})

// DELETE /api/pins/:username — unpin a creator
router.delete('/:username', (req, res) => {
  db.prepare('DELETE FROM pins WHERE username = ?').run(req.params.username)
  res.json({ ok: true })
})

module.exports = router
