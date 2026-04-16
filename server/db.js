const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = process.env.DB_DIR || path.join(__dirname, 'db')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const db = new Database(path.join(dbDir, 'data.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id              TEXT PRIMARY KEY,
    amount          REAL    NOT NULL DEFAULT 0,
    vat_amount      REAL             DEFAULT 0,
    tax_amount      REAL             DEFAULT 0,
    net             REAL             DEFAULT 0,
    fee             REAL             DEFAULT 0,
    currency        TEXT             DEFAULT 'USD',
    description     TEXT,
    status          TEXT,
    created_at      TEXT,
    source          TEXT,
    user_id         INTEGER,
    user_name       TEXT,
    user_username   TEXT,
    user_avatar     TEXT,
    user_avatar_c50 TEXT,
    user_avatar_c144 TEXT,
    user_is_verified INTEGER DEFAULT 0,
    raw             TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tx_created_at    ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_tx_user_username ON transactions(user_username);
  CREATE INDEX IF NOT EXISTS idx_tx_status        ON transactions(status);

  CREATE TABLE IF NOT EXISTS pins (
    username   TEXT PRIMARY KEY,
    pinned_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

module.exports = db
