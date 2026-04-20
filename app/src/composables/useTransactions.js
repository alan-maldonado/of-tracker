import { ref, computed } from 'vue'

// ── Global reactive state ────────────────────────────────────────────────────

export const transactions = ref([])
export const isLoading = ref(false)
export const loadError = ref(null)

// ── API calls ────────────────────────────────────────────────────────────────

export async function loadTransactions() {
  isLoading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/transactions?status=done&limit=10000')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { rows } = await res.json()
    transactions.value = rows
  } catch (e) {
    loadError.value = e.message
    console.error('[useTransactions] Failed to load:', e)
  } finally {
    isLoading.value = false
  }
}

export async function backupTransactions() {
  const res = await fetch('/api/transactions/backup', { method: 'POST' })
  if (!res.ok) throw new Error(`Backup failed: HTTP ${res.status}`)
  return res.json()
}

export async function importTransactions(data) {
  await backupTransactions()
  const res = await fetch('/api/transactions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`)
  const result = await res.json()
  await loadTransactions()
  return result
}

// Load on startup
loadTransactions()

// ── Pins (persisted to DB) ───────────────────────────────────────────────────

const _pins = ref([])

export const pinnedUsernames = computed(() => _pins.value)

export async function loadPins() {
  try {
    const res = await fetch('/api/pins')
    if (res.ok) _pins.value = await res.json()
  } catch {}
}

export async function togglePin(username) {
  const pinned = _pins.value.includes(username)
  // Optimistic update
  _pins.value = pinned
    ? _pins.value.filter(u => u !== username)
    : [..._pins.value, username]

  try {
    await fetch(`/api/pins/${encodeURIComponent(username)}`, {
      method: pinned ? 'DELETE' : 'POST',
    })
  } catch {
    // Rollback on failure
    await loadPins()
  }
}

export function isPinned(username) {
  return _pins.value.includes(username)
}

loadPins()

// ── Backup profiles ───────────────────────────────────────────────────────────

export const backupProfiles = ref(new Set())

export async function loadBackupProfiles() {
  try {
    const res = await fetch('/api/backup-profiles')
    if (res.ok) backupProfiles.value = new Set(await res.json())
  } catch {}
}

loadBackupProfiles()

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTxType(tx) {
  const desc = tx.description || ''
  if (desc.includes('Tip')) return 'tip'
  if (desc.includes('Subscription') || desc.includes('Recurring')) return 'subscription'
  if (desc.includes('Wallet top-up')) return 'topup'
  if (desc.includes('Payment')) return 'payment'
  return 'other'
}

export function formatCurrency(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

// ── useTransactions() composable ─────────────────────────────────────────────

export function useTransactions() {
  const allCreators = computed(() => {
    const map = {}
    for (const tx of transactions.value) {
      const type = getTxType(tx)
      if (type === 'topup') continue
      const user = tx.user
      if (!user) continue
      const key = user.username || user.id
      if (!map[key]) map[key] = {
        name: user.name,
        username: user.username,
        avatar: user.avatarThumbs?.c50 || user.avatar,
        total: 0,
        txCount: 0,
      }
      map[key].total += tx.amount || 0
      map[key].txCount++
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  })

  return { allCreators }
}
