<template>
  <div class="space-y-6">

    <!-- Pinned creators -->
    <div v-if="pinnedCreators.length" class="flex flex-wrap gap-2">
      <RouterLink
        v-for="c in pinnedCreators"
        :key="c.username"
        :to="`/profile/${c.username}`"
        class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-yellow-500/20 hover:border-yellow-500/50 transition-colors"
      >
        <img v-if="c.avatar" :src="c.avatar" class="w-7 h-7 rounded-full object-cover shrink-0" :alt="c.name" />
        <div v-else class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 shrink-0">{{ c.name?.[0] }}</div>
        <span class="text-sm text-gray-300 group-hover:text-white transition-colors max-w-[120px] truncate">{{ c.name }}</span>
        <button
          @click.prevent="togglePin(c.username)"
          class="text-yellow-500/30 hover:text-yellow-400 transition-colors ml-0.5 shrink-0"
          title="Unpin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </RouterLink>
    </div>

    <!-- Time filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex gap-1 flex-wrap">
        <button
          v-for="p in presets"
          :key="p.value"
          @click="selectPreset(p.value)"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activePreset === p.value
              ? 'bg-pink-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          ]"
        >{{ p.label }}</button>
      </div>

      <!-- Year picker -->
      <div class="relative ml-auto" ref="yearPickerEl">
        <button
          @click="yearPickerOpen = !yearPickerOpen"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
            activePreset === 'year'
              ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {{ activePreset === 'year' ? selectedYear : 'By year' }}
          <span class="text-xs opacity-60">▾</span>
        </button>
        <Transition name="dropdown">
          <div v-if="yearPickerOpen" class="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-10 min-w-[80px]">
            <button
              v-for="y in availableYears"
              :key="y"
              @click="selectYear(y)"
              :class="[
                'w-full px-4 py-2 text-sm text-left transition-colors',
                selectedYear === y && activePreset === 'year'
                  ? 'text-pink-400 bg-pink-500/10'
                  : 'text-gray-300 hover:bg-gray-700'
              ]"
            >{{ y }}</button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <SummaryCard label="Balance" :value="formatCurrency(balance)" color="green" icon="💰" />
      <SummaryCard label="Total Spent" :value="formatCurrency(stats.spent)" color="pink" icon="💸" />
      <SummaryCard label="Top-ups" :value="formatCurrency(stats.topups)" color="blue" icon="💳" />
      <SummaryCard label="Tips" :value="formatCurrency(stats.tips)" color="yellow" icon="💝" />
      <SummaryCard label="Subscriptions" :value="formatCurrency(stats.subs)" color="purple" icon="📬" />
    </div>

    <!-- Top creators -->
    <div class="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-white">Top Creators by Spend</h2>
        <button
          @click="showAll = !showAll"
          class="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
        >
          {{ showAll ? 'View less' : `View all (${filteredCreators.length})` }}
          <span :class="['transition-transform duration-200 inline-block', showAll ? 'rotate-180' : '']">▾</span>
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="(creator, i) in visibleCreators"
          :key="creator.username || i"
          class="flex items-center gap-3"
        >
          <span class="text-gray-500 text-sm w-5 text-right shrink-0">{{ i + 1 }}</span>
          <RouterLink :to="`/profile/${creator.username}`" class="shrink-0">
            <img
              v-if="creator.avatar"
              :src="creator.avatar"
              class="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-pink-500/60 transition-all"
              :alt="creator.name"
            />
            <div v-else class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
              {{ creator.name?.[0] }}
            </div>
          </RouterLink>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <RouterLink
                v-if="creator.username"
                :to="`/profile/${creator.username}`"
                class="text-sm font-medium text-white truncate hover:text-pink-400 transition-colors"
              >{{ creator.name }}</RouterLink>
              <span v-else class="text-sm font-medium text-white truncate">{{ creator.name }}</span>
              <span class="text-sm font-semibold text-pink-400 ml-2 shrink-0">{{ formatCurrency(creator.total) }}</span>
            </div>
            <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-pink-500 rounded-full transition-all duration-500"
                :style="{ width: filteredCreators.length ? (creator.total / filteredCreators[0].total * 100) + '%' : '0%' }"
              ></div>
            </div>
          </div>
        </div>
        <p v-if="!filteredCreators.length" class="text-sm text-gray-600 text-center py-4">No transactions in this period</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import SummaryCard from '../components/SummaryCard.vue'
import { formatCurrency, getTxType, transactions, pinnedUsernames, togglePin, useTransactions } from '../composables/useTransactions'

const { allCreators } = useTransactions()

const pinnedCreators = computed(() =>
  pinnedUsernames.value
    .map(u => allCreators.value.find(c => c.username === u))
    .filter(Boolean)
)

// --- Time filter ---
const now = new Date()

const presets = [
  { value: 'all',   label: 'All Time' },
  { value: 'year',  label: 'This Year' },
  { value: 'month', label: 'This Month' },
  { value: 'week',  label: 'This Week' },
]

const STORAGE_KEY = 'of-dashboard-filter'

function loadFilter() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved) return saved
  } catch {}
  return { preset: 'all', year: now.getFullYear() }
}

function saveFilter() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: activePreset.value, year: selectedYear.value }))
}

const { preset: savedPreset, year: savedYear } = loadFilter()
const activePreset = ref(savedPreset)
const selectedYear = ref(savedYear)
const yearPickerOpen = ref(false)
const yearPickerEl = ref(null)

const availableYears = computed(() => {
  const years = new Set(transactions.value.map(tx => new Date(tx.createdAt).getFullYear()))
  return [...years].sort((a, b) => b - a)
})

function selectPreset(value) {
  activePreset.value = value
  if (value !== 'year') selectedYear.value = now.getFullYear()
  saveFilter()
}

function selectYear(y) {
  selectedYear.value = y
  activePreset.value = 'year'
  saveFilter()
  yearPickerOpen.value = false
}

function onClickOutside(e) {
  if (yearPickerEl.value && !yearPickerEl.value.contains(e.target)) yearPickerOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

// --- Filter transactions by period ---
const filteredTxs = computed(() => {
  const txs = transactions.value
  if (activePreset.value === 'all') return txs

  return txs.filter(tx => {
    if (!tx.createdAt) return false
    const d = new Date(tx.createdAt)

    if (activePreset.value === 'year') return d.getFullYear() === selectedYear.value
    if (activePreset.value === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    if (activePreset.value === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return d >= startOfWeek
    }
    return true
  })
})

// --- Stats ---
const stats = computed(() => {
  let spent = 0, topups = 0, tips = 0, subs = 0
  for (const tx of filteredTxs.value) {
    const type = getTxType(tx)
    if (type === 'topup') topups += tx.amount || 0
    else {
      spent += tx.amount || 0
      if (type === 'tip') tips += tx.amount || 0
      if (type === 'subscription') subs += tx.amount || 0
    }
  }
  return { spent, topups, tips, subs }
})

const balance = computed(() => {
  let topups = 0, spent = 0
  for (const tx of transactions.value) {
    if (tx.source === 'card') continue
    const type = getTxType(tx)
    if (type === 'topup') topups += tx.amount || 0
    else spent += (tx.amount || 0) + (tx.vatAmount || 0)
  }
  return topups - spent
})

// --- Creators ---
const filteredCreators = computed(() => {
  const map = {}
  for (const tx of filteredTxs.value) {
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
    }
    map[key].total += tx.amount || 0
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
})

const showAll = ref(true)
const visibleCreators = computed(() => showAll.value ? filteredCreators.value : filteredCreators.value.slice(0, 8))
</script>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-leave-active { transition: opacity 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
