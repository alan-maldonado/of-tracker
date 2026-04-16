# OF Tracker

Dashboard for visualizing OnlyFans transaction data. Import your transactions from the scraper and explore spending by creator, month, and category.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3, Vite, Tailwind CSS, Chart.js |
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Reverse proxy | nginx |
| Container | Docker Compose |

---

## Project structure

```
of-tracker/
├── app/          # Vue 3 frontend
├── server/       # Express + SQLite backend
├── scrapper/     # Browser console scraper
├── data/         # SQLite database (gitignored)
└── docker-compose.yml
```

---

## Getting started

### With Docker (recommended)

```bash
docker compose up --build
```

Open [http://localhost:6905](http://localhost:6905).

The SQLite database is persisted in `./data/data.db` on your host machine.

---

### Local development

**Requirements:** Node.js ≥ 20

**Backend**

```bash
cd server
npm install
npm run dev       # starts on http://localhost:3001
```

**Frontend**

```bash
cd app
npm install
npm run dev       # starts on http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:3001` automatically.

---

## Scraper

The scraper collects transactions directly from the OnlyFans page using browser console injection.

1. Go to [https://onlyfans.com/my/payments/list](https://onlyfans.com/my/payments/list)
2. Open DevTools → Console
3. Paste the contents of `scrapper/transactions.js`
4. Run `await __fetchAll()` — auto-scrolls and collects all pages
5. Run `__downloadTransactions()` — downloads `onlyfans_transactions_N.json`

**Available helpers**

| Command | Description |
|---------|-------------|
| `await __fetchAll()` | Collect all pages automatically |
| `__stopFetch()` | Stop mid-collection |
| `__status()` | Show count and pagination state |
| `__downloadTransactions()` | Download collected data as JSON |
| `__clearTransactions()` | Reset in-memory collection |

---

## API

Base URL: `http://localhost:3001` (dev) / proxied through nginx in production.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/transactions/import` | Wipe table and insert array of transactions |
| `GET` | `/api/transactions` | List transactions (see filters below) |
| `GET` | `/api/transactions/:id` | Single transaction |
| `GET` | `/api/pins` | List pinned usernames |
| `POST` | `/api/pins/:username` | Pin a creator |
| `DELETE` | `/api/pins/:username` | Unpin a creator |

**GET `/api/transactions` query params**

| Param | Default | Description |
|-------|---------|-------------|
| `status` | `done` | `done` or `all` |
| `type` | — | `tip`, `subscription`, `topup`, `payment`, `other` |
| `username` | — | Exact match on creator username |
| `search` | — | Partial match on name, username, or description |
| `from` | — | ISO date lower bound |
| `to` | — | ISO date upper bound |
| `limit` | `500` | Max rows to return |
| `offset` | `0` | Pagination offset |

---

## Import / Export

Use the import button (top-right) to load a JSON file exported from the scraper. This **replaces** all existing transactions in the database.

Use the export button to download the current data as JSON.
