const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }))
app.use(express.json({ limit: '50mb' }))

app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/pins', require('./routes/pins'))

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
