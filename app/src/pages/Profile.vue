<template>
  <div>
  <div v-if="creator" class="space-y-6">

    <!-- Back -->
    <button @click="$router.back()" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
      <span>←</span> Back
    </button>

    <!-- Hero card -->
    <div class="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <button v-if="creator.avatar" @click="showModal = true" class="shrink-0 group relative">
        <img
          :src="creator.avatar"
          class="w-24 h-24 rounded-full object-cover ring-2 ring-pink-500/40 group-hover:ring-pink-500 transition-all cursor-zoom-in"
          :alt="creator.name"
        />
        <div class="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span class="text-white text-lg">🔍</span>
        </div>
      </button>
      <div v-else class="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-gray-400 shrink-0">
        {{ creator.name?.[0] }}
      </div>

      <div class="flex-1 min-w-0 text-center sm:text-left">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 class="text-2xl font-bold text-white">{{ creator.name }}</h1>
          <span v-if="creator.isVerified" class="text-blue-400 text-sm" title="Verified">✓ Verified</span>
        </div>
        <p class="text-gray-500 text-sm mt-0.5">@{{ creator.username }}</p>

        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <a
            :href="`https://onlyfans.com/${creator.username}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 text-sm hover:bg-pink-500/20 transition-colors"
          >
            View on OnlyFans ↗
          </a>
          <a
            :href="backupUrl"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
          >
            Backup ↗
          </a>
          <button
            @click="togglePin(creator.username)"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
              pinned
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :fill="pinned ? 'currentColor' : 'none'">
              <line x1="12" y1="17" x2="12" y2="22"/>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
            {{ pinned ? 'Pinned' : 'Pin' }}
          </button>
        </div>
      </div>

      <!-- Total spent badge -->
      <div class="text-center shrink-0">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total spent</p>
        <p class="text-3xl font-bold text-pink-400">{{ formatCurrency(creator.total) }}</p>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
        <p class="text-2xl font-bold text-white">{{ creator.txCount }}</p>
        <p class="text-xs text-gray-500 mt-1">Transactions</p>
      </div>
      <div class="bg-gray-900 rounded-xl border border-yellow-500/20 p-4 text-center">
        <p class="text-2xl font-bold text-yellow-400">{{ formatCurrency(creator.tips) }}</p>
        <p class="text-xs text-gray-500 mt-1">Tips</p>
      </div>
      <div class="bg-gray-900 rounded-xl border border-purple-500/20 p-4 text-center">
        <p class="text-2xl font-bold text-purple-400">{{ formatCurrency(creator.subs) }}</p>
        <p class="text-xs text-gray-500 mt-1">Subscriptions</p>
      </div>
      <div class="bg-gray-900 rounded-xl border border-blue-500/20 p-4 text-center">
        <p class="text-2xl font-bold text-blue-400">{{ formatCurrency(creator.payments) }}</p>
        <p class="text-xs text-gray-500 mt-1">PPV Payments</p>
      </div>
    </div>

    <!-- Spending over time: line chart -->
    <div v-if="spendingByMonth.length > 1" class="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h2 class="text-base font-semibold text-white mb-4">Spend by month</h2>
      <Line :data="chartData" :options="chartOptions" class="max-h-48" />
    </div>

    <!-- Transaction history -->
    <div class="space-y-2">
      <h2 class="text-sm font-semibold text-white">
        History
        <span class="text-gray-600 font-normal ml-1">({{ creatorTxs.length }})</span>
      </h2>
      <TransactionRow v-for="tx in previewTxs" :key="tx.id" :tx="tx" :hideLink="true" />
      <RouterLink
        v-if="creatorTxs.length > 5"
        :to="{ path: '/transactions', query: { q: creator.username } }"
        class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-pink-500/40 text-sm text-gray-400 hover:text-pink-400 transition-colors"
      >
        View all {{ creatorTxs.length }} transactions
        <span>→</span>
      </RouterLink>
    </div>

  </div>

  <!-- Not found -->
  <div v-else class="text-center py-24 text-gray-600">
    <p class="text-4xl mb-3">¯\_(ツ)_/¯</p>
    <p>Profile not found</p>
    <button @click="$router.back()" class="mt-4 text-sm text-pink-400 hover:text-pink-300">← Back</button>
  </div>

  <!-- Avatar modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showModal && creator?.avatar"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click="showModal = false"
      >
        <div class="relative" @click.stop>
          <img
            :src="creator.avatarFull || creator.avatar"
            class="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            :alt="creator.name"
          />
          <button
            @click="showModal = false"
            class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm"
          >✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'
import TransactionRow from '../components/TransactionRow.vue'
import { transactions, getTxType, formatCurrency, togglePin, isPinned, pinnedUsernames } from '../composables/useTransactions'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const route = useRoute()
const username = computed(() => route.params.username)
const showModal = ref(false)
const pinned = computed(() => isPinned(username.value))
const backupUrl = computed(() => `http://${window.location.hostname}:6906/#/${username.value}`)

function onKeydown(e) { if (e.key === 'Escape') showModal.value = false }
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const creatorTxs = computed(() =>
  transactions.value.filter(tx => tx.user?.username === username.value)
)

const previewTxs = computed(() => creatorTxs.value.slice(0, 5))

const creator = computed(() => {
  const txs = creatorTxs.value
  if (!txs.length) return null
  const user = txs[0].user
  let total = 0, tips = 0, subs = 0, payments = 0
  for (const tx of txs) {
    const type = getTxType(tx)
    total += tx.amount || 0
    if (type === 'tip') tips += tx.amount || 0
    if (type === 'subscription') subs += tx.amount || 0
    if (type === 'payment') payments += tx.amount || 0
  }
  return {
    name: user.name,
    username: user.username,
    avatar: user.avatarThumbs?.c144 || user.avatarThumbs?.c50 || user.avatar,
    avatarFull: user.avatar,
    isVerified: user.isVerified,
    total,
    tips,
    subs,
    payments,
    txCount: txs.length,
  }
})

const spendingByMonth = computed(() => {
  const map = {}
  for (const tx of creatorTxs.value) {
    if (!tx.createdAt) continue
    const d = new Date(tx.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { key, total: 0 }
    map[key].total += tx.amount || 0
  }

  const keys = Object.keys(map).sort()
  if (!keys.length) return []

  // Fill in missing months between first and last
  const [startYear, startMonth] = keys[0].split('-').map(Number)
  const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number)
  const filled = []
  let y = startYear, mo = startMonth
  while (y < endYear || (y === endYear && mo <= endMonth)) {
    const key = `${y}-${String(mo).padStart(2, '0')}`
    const d = new Date(y, mo - 1, 1)
    filled.push({
      key,
      total: map[key]?.total || 0,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      shortLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
    mo++
    if (mo > 12) { mo = 1; y++ }
  }
  return filled
})

const chartData = computed(() => ({
  labels: spendingByMonth.value.map(m => m.shortLabel),
  datasets: [{
    data: spendingByMonth.value.map(m => m.total),
    borderColor: '#ec4899',
    borderWidth: 2,
    pointBackgroundColor: '#ec4899',
    pointRadius: 3,
    pointHoverRadius: 5,
    fill: true,
    backgroundColor: (ctx) => {
      const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
      gradient.addColorStop(0, 'rgba(236,72,153,0.25)')
      gradient.addColorStop(1, 'rgba(236,72,153,0)')
      return gradient
    },
    tension: 0.3,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    tooltip: {
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      titleColor: '#9ca3af',
      bodyColor: '#f9a8d4',
      bodyFont: { weight: 'bold' },
      padding: 10,
      callbacks: {
        label: ctx => formatCurrency(ctx.raw),
      },
    },
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { color: '#1f2937' },
      ticks: { color: '#6b7280', font: { size: 11 } },
    },
    y: {
      grid: { color: '#1f2937' },
      ticks: {
        color: '#6b7280',
        font: { size: 11 },
        callback: v => '$' + v,
      },
      beginAtZero: true,
    },
  },
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
