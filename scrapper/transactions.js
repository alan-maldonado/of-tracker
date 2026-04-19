// ─────────────────────────────────────────────────────────────────────────────
// OnlyFans Transaction Scraper
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://onlyfans.com/my/payments/  ← Your cards tab (NOT the list)
// 2. Open DevTools → Console
// 3. Paste this entire script and press Enter
// 4. Run: await __fetchAll()   ← clicks Payments tab, fetches all pages automatically
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

  // Seed from window.data if available (merges without duplicates)
  if (Array.isArray(window.data) && window.data.length) {
    window.__transactions = window.__transactions || []
    for (const tx of window.data) {
      if (tx?.id && !window.__transactions.some(t => t.id === tx.id)) {
        window.__transactions.push(tx)
      }
    }
    console.log(`%c[OF Scraper] Loaded ${window.__transactions.length} transactions from window.data`, 'color:#ec4899;font-weight:bold')
  } else {
    window.__transactions = window.__transactions || []
  }
  // Rebuild seen set from existing data so re-pasting the script doesn't duplicate
  const seen = new Set(window.__transactions.map(tx => tx.id).filter(Boolean))

  let _hasMore = null
  let _nextMarker = null
  let _capturedHeaders = null
  let _stopRequested = false
  let _foundOverlap = false

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function log(msg) {
    console.log(`%c[OF Scraper] ${msg}`, 'color:#ec4899;font-weight:bold')
  }

  function processResponse(json, hasInitialData) {
    const items = json?.list
    if (!Array.isArray(items)) return 0
    let added = 0
    for (const item of items) {
      if (!item.id) continue
      if (seen.has(item.id)) {
        // Hit a transaction we already have — no need to go further back
        if (hasInitialData) _foundOverlap = true
        continue
      }
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
      try { processResponse(JSON.parse(this.responseText), _hasInitialData) } catch {}
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
      try { processResponse(await response.clone().json(), _hasInitialData) } catch {}
    }
    return response
  }

  // ── DOM scraper — reads page 1 transactions already rendered on screen ───────

  function scrapeDomTransactions() {
    const rows = document.querySelectorAll('table.b-table tbody tr.m-responsive__reset-pb')
    if (!rows.length) {
      log('No transaction rows found in DOM.')
      return 0
    }

    let added = 0
    for (const row of rows) {
      // ── Date → ISO string ──────────────────────────────────────────────────
      const dateText = row.querySelector('.datetime .date')?.textContent?.trim() || ''
      const createdAt = dateText ? new Date(dateText).toISOString() : null

      // ── Amount ─────────────────────────────────────────────────────────────
      const amountText = row.querySelector('td:nth-child(2) strong')?.textContent?.trim() || ''
      const amountMatch = amountText.match(/\$([\d.,]+)/)
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0
      const vatMatch = amountText.match(/(\d+)%\s*VAT/)
      const vatRate = vatMatch ? parseInt(vatMatch[1]) / 100 : 0
      const vatAmount = vatRate ? parseFloat((amount * vatRate / (1 + vatRate)).toFixed(2)) : 0
      const net = parseFloat((amount - vatAmount).toFixed(2))

      // ── Description ────────────────────────────────────────────────────────
      const descEl = row.querySelector('.b-card-box__description')
      const description = descEl?.textContent?.trim() || ''

      // ── ID: firstId from chat link, else synthetic ─────────────────────────
      const msgLink = row.querySelector('a[href*="firstId="]')
      let id
      if (msgLink) {
        const firstId = new URL(msgLink.href).searchParams.get('firstId')
        id = `dom_msg_${firstId}`
      } else {
        id = `dom_${(createdAt || dateText).replace(/[^a-zA-Z0-9]/g, '_')}_${amount}`
      }

      if (seen.has(id)) continue
      seen.add(id)

      // ── User (creator) ─────────────────────────────────────────────────────
      const profileLink = row.querySelector('.b-card-box__description a[href*="onlyfans.com/"]:not([href*="/chats/"])')
      let user = null
      if (profileLink) {
        const username = profileLink.href.replace(/.*onlyfans\.com\//, '').replace(/\?.*/, '')
        const name = profileLink.textContent?.trim() || username
        user = { username, name }
      }

      // ── Source (wallet vs card) ────────────────────────────────────────────
      const cardImg = row.querySelector('.b-card-box__icon')
      const cardholderText = row.querySelector('.b-card-box__cardholder')?.textContent?.trim() || ''
      const source = cardImg ? cardholderText : 'wallet'

      window.__transactions.push({
        id,
        _domScraped: true,
        amount,
        vatAmount,
        taxAmount: 0,
        net,
        fee: 0,
        currency: 'USD',
        description,
        status: 'done',
        createdAt,
        source,
        user,
      })
      added++
    }

    if (added > 0) log(`DOM scrape: +${added} new · total: ${window.__transactions.length}`)
    else log('DOM scrape: no new transactions (all already known)')
    return added
  }

  // ── fetchNewest ───────────────────────────────────────────────────────────────
  // Primary: click Error tab → All tab so OF re-fetches page 1 with interceptors ready.
  // Fallback: DOM scrape for whatever is already rendered.

  async function fetchNewest(scrollIntervalMs) {
    // Primary: click the Payments tab from Your cards page so interceptors
    // are already in place when OF fetches page 1 for the first time.
    const paymentsTab = document.querySelector('a[href="/my/payments/list"]')
    if (paymentsTab) {
      log('Clicking Payments tab to trigger fresh page 1 fetch...')
      paymentsTab.click()

      const PAGE1_TIMEOUT = 10000
      const countBefore = window.__transactions.length
      const t0 = Date.now()
      while (Date.now() - t0 < PAGE1_TIMEOUT) {
        await new Promise(r => setTimeout(r, 400))
        if (window.__transactions.length > countBefore) {
          log(`Page 1 captured! (+${window.__transactions.length - countBefore} new)`)
          return
        }
      }
      log('Payments tab click did not yield results — falling back to DOM scrape')
    }

    // Fallback: already on /payments/list, scrape what is rendered
    scrapeDomTransactions()
  }

  // ── Auto-fetch all pages ──────────────────────────────────────────────────

  // Set before __fetchAll runs so interceptors know whether initial data existed
  let _hasInitialData = false

  window.__fetchAll = async function (scrollIntervalMs = 1000) {
    _stopRequested = false
    _foundOverlap = false
    _hasInitialData = window.__transactions.length > 0

    if (_hasInitialData) {
      log(`Resuming sync — ${window.__transactions.length} existing transactions, will stop when overlap found`)
    }

    // Step 1: scroll down to capture page 2 headers, then scroll up for page 1
    // Reset overlap flag so page 2 interception during fetchNewest doesn't stop us early
    _foundOverlap = false
    await fetchNewest(scrollIntervalMs)
    _foundOverlap = false  // reset again — overlap during fetchNewest is expected

    // Step 2: continue scrolling to bottom for remaining older pages
    log('Scrolling down to collect older pages...')
    let lastCount = window.__transactions.length
    let staleRounds = 0
    const STALE_LIMIT = 15 // × scrollIntervalMs before giving up

    while (!_stopRequested) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
      await new Promise(r => setTimeout(r, scrollIntervalMs))

      if (_foundOverlap) {
        log(`Overlap with existing data found — sync complete! Total: ${window.__transactions.length}`)
        copyToClipboard()
        return window.__transactions
      }

      const current = window.__transactions.length
      if (current !== lastCount) {
        lastCount = current
        staleRounds = 0
      } else {
        staleRounds++
      }

      if (_hasMore === false) {
        log(`All pages loaded! ${window.__transactions.length} transactions total`)
        copyToClipboard()
        return window.__transactions
      }

      if (staleRounds >= STALE_LIMIT) {
        log(`No new data for ~${((STALE_LIMIT * scrollIntervalMs) / 1000).toFixed(0)}s · total: ${window.__transactions.length} · hasMore: ${_hasMore}`)
        if (_hasMore) log('Run __fetchAll() again to resume.')
        copyToClipboard()
        return window.__transactions
      }
    }

    log(`Stopped. Total: ${window.__transactions.length}`)
    copyToClipboard()
    return window.__transactions
  }

  function copyToClipboard() {
    window.__transactions.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    try {
      copy(JSON.stringify(window.__transactions))
      log(`Copied ${window.__transactions.length} transactions to clipboard ✓ (newest first)`)
    } catch (e) {
      log(`Could not auto-copy — run this manually:\n\ncopy(JSON.stringify(window.__transactions))`)
    }
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
    copy(JSON.stringify(window.__transactions))
    log(`Downloaded ${window.__transactions.length} transactions — also copied to clipboard`)
  }

  window.__clearTransactions = function () {
    window.__transactions = []
    seen.clear()
    _hasMore = null
    _nextMarker = null
    _capturedHeaders = null
    _foundOverlap = false
    _hasInitialData = false
    log('Cleared.')
  }

  log('Ready! Run: await __fetchAll()')
})()

__fetchAll()
