const { Router } = require('express')
const db = require('../db')

const router = Router()

// ── POST /api/import ──────────────────────────────────────────────────────────
// Body: array of raw OF transaction objects
// Wipes the table and inserts everything fresh.

router.post('/import', (req, res) => {
  const items = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body must be an array' })

  const insert = db.prepare(`
    INSERT INTO transactions (
      id, amount, vat_amount, tax_amount, net, fee,
      currency, description, status, created_at, source,
      user_id, user_name, user_username,
      user_avatar, user_avatar_c50, user_avatar_c144,
      user_is_verified, raw
    ) VALUES (
      @id, @amount, @vat_amount, @tax_amount, @net, @fee,
      @currency, @description, @status, @created_at, @source,
      @user_id, @user_name, @user_username,
      @user_avatar, @user_avatar_c50, @user_avatar_c144,
      @user_is_verified, @raw
    )
  `)

  const importAll = db.transaction((rows) => {
    db.prepare('DELETE FROM transactions').run()
    let inserted = 0
    for (const tx of rows) {
      insert.run({
        id:               tx.id,
        amount:           tx.amount          ?? 0,
        vat_amount:       tx.vatAmount        ?? 0,
        tax_amount:       tx.taxAmount        ?? 0,
        net:              tx.net              ?? 0,
        fee:              tx.fee              ?? 0,
        currency:         tx.currency         ?? 'USD',
        description:      tx.description      ?? null,
        status:           tx.status           ?? null,
        created_at:       tx.createdAt        ?? null,
        source:           tx.source           ?? null,
        user_id:          tx.user?.id         ?? null,
        user_name:        tx.user?.name       ?? null,
        user_username:    tx.user?.username   ?? null,
        user_avatar:      tx.user?.avatar     ?? null,
        user_avatar_c50:  tx.user?.avatarThumbs?.c50  ?? null,
        user_avatar_c144: tx.user?.avatarThumbs?.c144 ?? null,
        user_is_verified: tx.user?.isVerified ? 1 : 0,
        raw:              JSON.stringify(tx),
      })
      inserted++
    }
    return inserted
  })

  const inserted = importAll(items)
  res.json({ ok: true, inserted })
})

// ── GET /api/transactions ─────────────────────────────────────────────────────
// Query params:
//   status   → filter by status (default: 'done', pass 'all' to skip)
//   type     → tip | subscription | topup | payment | other
//   username → filter by user_username (partial match)
//   search   → search description / user_name / user_username
//   from     → ISO date lower bound (created_at >=)
//   to       → ISO date upper bound (created_at <=)
//   limit    → default 500
//   offset   → default 0

router.get('/', (req, res) => {
  const {
    status   = 'done',
    type,
    username,
    search,
    from,
    to,
    limit  = 500,
    offset = 0,
  } = req.query

  const conditions = []
  const params = {}

  if (status && status !== 'all') {
    conditions.push('status = @status')
    params.status = status
  }

  if (type && type !== 'all') {
    const typeMap = {
      tip:          "description LIKE '%Tip%'",
      subscription: "description LIKE '%Subscription%' OR description LIKE '%Recurring%'",
      topup:        "description LIKE '%Wallet top-up%'",
      payment:      "description LIKE '%Payment%'",
      other:        "description NOT LIKE '%Tip%' AND description NOT LIKE '%Subscription%' AND description NOT LIKE '%Recurring%' AND description NOT LIKE '%Wallet top-up%' AND description NOT LIKE '%Payment%'",
    }
    if (typeMap[type]) conditions.push(`(${typeMap[type]})`)
  }

  if (username) {
    conditions.push('user_username = @username')
    params.username = username
  }

  if (search) {
    conditions.push('(user_name LIKE @search OR user_username LIKE @search OR description LIKE @search)')
    params.search = `%${search}%`
  }

  if (from) {
    conditions.push('created_at >= @from')
    params.from = from
  }

  if (to) {
    conditions.push('created_at <= @to')
    params.to = to
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db.prepare(`SELECT * FROM transactions ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: Number(limit), offset: Number(offset) })

  const total = db.prepare(`SELECT COUNT(*) as count FROM transactions ${where}`)
    .get(params).count

  res.json({ total, rows: rows.map(row => JSON.parse(row.raw)) })
})

// ── GET /api/transactions/:id ─────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT raw FROM transactions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(JSON.parse(row.raw))
})

module.exports = router
