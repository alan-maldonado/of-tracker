// ─────────────────────────────────────────────────────────────────────────────
// OnlyFans Transaction Scraper
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://onlyfans.com/my/payments/list
// 2. Open DevTools → Console
// 3. Paste this entire script and press Enter
// 4. Scroll down to load more transactions (or use __startAutoScroll())
// 5. When done, run: __downloadTransactions()
//
// Helpers available after pasting:
//   __status()               → show collected count
//   __downloadTransactions() → download JSON file
//   __clearTransactions()    → reset collected data
//   __startAutoScroll(ms)    → auto-scroll every N ms (default 1000)
//   __stopAutoScroll()       → stop auto-scroll
// ─────────────────────────────────────────────────────────────────────────────

;(function () {
  'use strict'

  const seen = new Set()
  window.__transactions = window.__transactions || []
  let _scrollTimer = null

  function processItems(items) {
    if (!Array.isArray(items)) return 0
    let added = 0
    for (const item of items) {
      if (!item.id || seen.has(item.id)) continue
      seen.add(item.id)
      window.__transactions.push(item)
      added++
    }
    if (added > 0) {
      console.log(`%c[OF Scraper] +${added} new · total: ${window.__transactions.length}`, 'color:#ec4899;font-weight:bold')
    }
    return added
  }

  function isTransactionUrl(url) {
    return typeof url === 'string' && (
      url.includes('/payments/list') ||
      url.includes('transactions')
    )
  }

  // ── XHR intercept ──────────────────────────────────────────────────────────
  const _origOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    this.addEventListener('load', function () {
      if (!isTransactionUrl(url)) return
      try {
        const json = JSON.parse(this.responseText)
        if (json?.list) processItems(json.list)
        else if (Array.isArray(json)) processItems(json)
        else if (json?.data) processItems(json.data)
      } catch {}
    })
    return _origOpen.apply(this, arguments)
  }

  // ── Fetch intercept ────────────────────────────────────────────────────────
  const _origFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await _origFetch.apply(this, args)
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    if (isTransactionUrl(url)) {
      try {
        const json = await response.clone().json()
        if (json?.list) processItems(json.list)
        else if (Array.isArray(json)) processItems(json)
        else if (json?.data) processItems(json.data)
      } catch {}
    }
    return response
  }

  // ── Helper functions ───────────────────────────────────────────────────────
  window.__status = function () {
    console.log(`%c[OF Scraper] ${window.__transactions.length} transactions collected`, 'color:#ec4899;font-weight:bold')
  }

  window.__downloadTransactions = function () {
    if (!window.__transactions.length) {
      console.warn('[OF Scraper] No transactions to download yet — scroll down to load some first.')
      return
    }
    const blob = new Blob([JSON.stringify(window.__transactions, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `onlyfans_transactions_${window.__transactions.length}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    console.log(`%c[OF Scraper] Downloaded ${window.__transactions.length} transactions`, 'color:#ec4899;font-weight:bold')
  }

  window.__clearTransactions = function () {
    window.__transactions = []
    seen.clear()
    console.log('[OF Scraper] Cleared.')
  }

  window.__startAutoScroll = function (intervalMs = 1000) {
    if (_scrollTimer) { console.log('[OF Scraper] Auto-scroll already running.'); return }
    console.log(`%c[OF Scraper] Auto-scroll started (every ${intervalMs}ms) — run __stopAutoScroll() to stop`, 'color:#ec4899')
    _scrollTimer = setInterval(() => {
      window.scrollBy({ top: 600, behavior: 'smooth' })
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100
      if (atBottom) {
        console.log('%c[OF Scraper] Reached bottom — stopping auto-scroll', 'color:#ec4899')
        window.__stopAutoScroll()
      }
    }, intervalMs)
  }

  window.__stopAutoScroll = function () {
    if (_scrollTimer) { clearInterval(_scrollTimer); _scrollTimer = null }
    console.log('[OF Scraper] Auto-scroll stopped.')
  }

  console.log('%c[OF Scraper] Ready! Scroll down to collect transactions, then run __downloadTransactions()', 'color:#ec4899;font-weight:bold;font-size:13px')
})()
