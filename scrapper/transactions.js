// ─────────────────────────────────────────────────────────────────────────────
// OnlyFans Transaction Scraper
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://onlyfans.com/my/payments/list
// 2. Open DevTools → Console
// 3. Paste this entire script and press Enter
// 4. Run: await __fetchAll()   ← fetches all pages automatically
// 5. Run: __downloadTransactions()
//
// Helpers:
//   __status()               → collected count + pagination state
//   __fetchAll()             → collect all pages (async)
//   __stopFetch()            → stop early
//   __downloadTransactions() → download JSON file
//   __clearTransactions()    → reset
// ─────────────────────────────────────────────────────────────────────────────

;(function () {
  'use strict'

  const API_BASE = 'https://onlyfans.com/api2/v2/payments/all/transactions'
  const CAPTURE_HEADERS = ['sign', 'time', 'user-id', 'x-bc', 'x-hash', 'app-token', 'x-of-rev', 'x-hash-time']

  window.__transactions = window.__transactions || []
  // Rebuild seen set from existing data so re-pasting the script doesn't duplicate
  const seen = new Set(window.__transactions.map(tx => tx.id).filter(Boolean))

  let _hasMore = null
  let _nextMarker = null
  let _capturedHeaders = null
  let _stopRequested = false

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function log(msg) {
    console.log(`%c[OF Scraper] ${msg}`, 'color:#ec4899;font-weight:bold')
  }

  function processResponse(json) {
    const items = json?.list
    if (!Array.isArray(items)) return 0
    let added = 0
    for (const item of items) {
      if (!item.id || seen.has(item.id)) continue
      seen.add(item.id)
      window.__transactions.push(item)
      added++
    }
    _hasMore = json.hasMore ?? false
    _nextMarker = json.nextMarker ?? null
    if (added > 0) log(`+${added} new · total: ${window.__transactions.length} · hasMore: ${_hasMore}`)
    return added
  }

  function isTransactionUrl(url) {
    return typeof url === 'string' && url.includes('/payments/all/transactions')
  }

  // ── XHR intercept (captures headers + response) ───────────────────────────

  const _origOpen = XMLHttpRequest.prototype.open
  const _origSetHeader = XMLHttpRequest.prototype.setRequestHeader

  XMLHttpRequest.prototype.open = function (method, url) {
    this._ofUrl = url
    this._ofHeaders = {}
    this.addEventListener('load', function () {
      if (!isTransactionUrl(this._ofUrl)) return
      if (Object.keys(this._ofHeaders).length) _capturedHeaders = { ...this._ofHeaders }
      try { processResponse(JSON.parse(this.responseText)) } catch {}
    })
    return _origOpen.apply(this, arguments)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._ofHeaders && CAPTURE_HEADERS.includes(name.toLowerCase())) {
      this._ofHeaders[name.toLowerCase()] = value
    }
    return _origSetHeader.apply(this, arguments)
  }

  // ── Fetch intercept (captures headers + response) ─────────────────────────

  const _origFetch = window.fetch
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    const opts = (typeof args[0] === 'string' ? args[1] : args[0]) || {}

    if (isTransactionUrl(url) && opts.headers) {
      const h = opts.headers instanceof Headers
        ? Object.fromEntries(opts.headers.entries())
        : opts.headers
      const captured = {}
      for (const k of CAPTURE_HEADERS) {
        const v = h[k] || h[k.toLowerCase()]
        if (v) captured[k] = v
      }
      if (Object.keys(captured).length) _capturedHeaders = { ..._capturedHeaders, ...captured }
    }

    const response = await _origFetch.apply(this, args)
    if (isTransactionUrl(url)) {
      try { processResponse(await response.clone().json()) } catch {}
    }
    return response
  }

  // ── Trigger first-page fetch (newest transactions) ────────────────────────
  // The page already loaded these before the script was pasted.
  // We scroll to top → OF re-requests the first page → we capture it.

  async function fetchNewest() {
    log('Scrolling to top to capture newest transactions...')
    window.scrollTo({ top: 0, behavior: 'instant' })

    // Wait for OF to react and (hopefully) re-request the first page
    await new Promise(r => setTimeout(r, 2000))

    // If scroll-to-top didn't trigger a request, try a direct API call
    // using headers freshly captured from any intercepted request.
    if (_capturedHeaders) {
      try {
        const res = await _origFetch(`${API_BASE}?limit=20&type=all`, {
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*',
            ..._capturedHeaders,
          },
        })
        if (res.ok) {
          const json = await res.json()
          const added = processResponse(json)
          if (added > 0) log(`First page captured via direct fetch (+${added})`)
        } else {
          log(`Direct first-page fetch returned ${res.status} — sign may have expired, relying on scroll only`)
        }
      } catch (e) {
        log(`Direct first-page fetch error: ${e.message}`)
      }
    }
  }

  // ── Auto-fetch all pages ──────────────────────────────────────────────────

  window.__fetchAll = async function (scrollIntervalMs = 1000) {
    _stopRequested = false

    // Step 1: grab the newest transactions (already on page but not intercepted)
    await fetchNewest()

    // Step 2: scroll to bottom repeatedly so OF loads older pages
    log('Scrolling down to collect older pages...')
    let lastCount = window.__transactions.length
    let staleRounds = 0
    const STALE_LIMIT = 15 // × scrollIntervalMs before giving up

    while (!_stopRequested) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
      await new Promise(r => setTimeout(r, scrollIntervalMs))

      const current = window.__transactions.length
      if (current !== lastCount) {
        lastCount = current
        staleRounds = 0
      } else {
        staleRounds++
      }

      if (_hasMore === false) {
        log(`All pages loaded! ${window.__transactions.length} transactions total`)
        return window.__transactions
      }

      if (staleRounds >= STALE_LIMIT) {
        log(`No new data for ~${((STALE_LIMIT * scrollIntervalMs) / 1000).toFixed(0)}s · total: ${window.__transactions.length} · hasMore: ${_hasMore}`)
        if (_hasMore) log('Run __fetchAll() again to resume.')
        return window.__transactions
      }
    }

    log(`Stopped. Total: ${window.__transactions.length}`)
    return window.__transactions
  }

  window.__stopFetch = function () {
    _stopRequested = true
  }

  // ── Other helpers ─────────────────────────────────────────────────────────

  window.__status = function () {
    log(`${window.__transactions.length} collected · hasMore: ${_hasMore} · nextMarker: ${_nextMarker} · headers: ${_capturedHeaders ? '✓' : 'none'}`)
  }

  window.__downloadTransactions = function () {
    if (!window.__transactions.length) {
      console.warn('[OF Scraper] Nothing to download yet.')
      return
    }
    const blob = new Blob([JSON.stringify(window.__transactions, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `onlyfans_transactions_${window.__transactions.length}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    log(`Downloaded ${window.__transactions.length} transactions`)
  }

  window.__clearTransactions = function () {
    window.__transactions = []
    seen.clear()
    _hasMore = null
    _nextMarker = null
    _capturedHeaders = null
    log('Cleared.')
  }

  log('Ready! Run: await __fetchAll()')
})()

__fetchAll()
