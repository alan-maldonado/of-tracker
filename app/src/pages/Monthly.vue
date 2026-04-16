<template>
  <div class="space-y-4">
    <!-- Month selector -->
    <div class="month-scroll flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="m in filteredMonths"
        :key="m.key"
        @click="selectedMonth = m.key"
        :class="[
          'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
          selectedMonth === m.key
            ? 'bg-pink-500 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        ]"
      >
        {{ m.shortLabel }}
      </button>
    </div>

    <!-- Month summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4" v-if="selectedData">
      <div class="bg-gray-900 rounded-2xl border border-pink-500/20 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Spent</p>
        <p class="text-xl font-bold text-pink-400">{{ formatCurrency(selectedData.spent) }}</p>
      </div>
      <div class="bg-gray-900 rounded-2xl border border-blue-500/20 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Added</p>
        <p class="text-xl font-bold text-blue-400">{{ formatCurrency(selectedData.topups) }}</p>
      </div>
      <div class="bg-gray-900 rounded-2xl border border-yellow-500/20 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Tips</p>
        <p class="text-xl font-bold text-yellow-400">{{ formatCurrency(selectedData.tips) }}</p>
      </div>
      <div class="bg-gray-900 rounded-2xl border border-purple-500/20 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Subscriptions</p>
        <p class="text-xl font-bold text-purple-400">{{ formatCurrency(selectedData.subs) }}</p>
      </div>
    </div>

    <!-- Bar chart: spending by month -->
    <div class="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-base font-semibold text-white">Monthly spend</h2>
        <!-- Year filter -->
        <div class="flex gap-1">
          <button
            v-for="y in years"
            :key="y"
            @click="selectedYear = y"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              selectedYear === y
                ? 'bg-pink-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            ]"
          >
            {{ y }}
          </button>
        </div>
      </div>
      <Bar :data="chartData" :options="chartOptions" class="max-h-48" />
    </div>

    <!-- Transactions of selected month -->
    <div class="space-y-2" v-if="selectedData">
      <h2 class="text-sm font-semibold text-white">
        Transactions for {{ selectedData.label }}
        <span class="text-gray-600 font-normal ml-1">({{ selectedData.txs.length }})</span>
      </h2>
      <TransactionRow
        v-for="tx in selectedData.txs"
        :key="tx.id"
        :tx="tx"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import TransactionRow from '../components/TransactionRow.vue'
import { transactions, getTxType, formatCurrency } from '../composables/useTransactions'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const allMonths = computed(() => {
  const map = {}
  for (const tx of transactions.value) {
    if (!tx.createdAt) continue
    const d = new Date(tx.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { key, txs: [], spent: 0, topups: 0, tips: 0, subs: 0 }
    map[key].txs.push(tx)
    const type = getTxType(tx)
    if (type === 'topup') map[key].topups += tx.amount || 0
    else {
      map[key].spent += tx.amount || 0
      if (type === 'tip') map[key].tips += tx.amount || 0
      if (type === 'subscription') map[key].subs += tx.amount || 0
    }
  }
  return Object.values(map)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(m => {
      const [year, month] = m.key.split('-')
      const d = new Date(Number(year), Number(month) - 1, 1)
      return {
        ...m,
        year: Number(year),
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        shortLabel: d.toLocaleDateString('en-US', { month: 'short' }),
      }
    })
})

const years = computed(() => [...new Set(allMonths.value.map(m => m.year))].sort())

const latestYear = years.value.length ? years.value[years.value.length - 1] : null
const selectedYear = ref(latestYear)

const filteredMonths = computed(() =>
  allMonths.value.filter(m => m.year === selectedYear.value)
)

const selectedMonth = ref(null)

// When year changes, select the last month of that year
watch(selectedYear, () => {
  const months = filteredMonths.value
  selectedMonth.value = months.length ? months[months.length - 1].key : null
}, { immediate: true })

const selectedData = computed(() => filteredMonths.value.find(m => m.key === selectedMonth.value) || null)

const chartData = computed(() => ({
  labels: filteredMonths.value.map(m => m.shortLabel),
  datasets: [{
    data: filteredMonths.value.map(m => m.spent),
    backgroundColor: filteredMonths.value.map(m =>
      m.key === selectedMonth.value ? '#ec4899' : 'rgba(236,72,153,0.4)'
    ),
    hoverBackgroundColor: '#ec4899',
    borderRadius: 6,
    borderSkipped: false,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  onClick: (_, elements) => {
    if (elements.length) selectedMonth.value = filteredMonths.value[elements[0].index].key
  },
  plugins: {
    tooltip: {
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      titleColor: '#9ca3af',
      bodyColor: '#f9a8d4',
      bodyFont: { weight: 'bold' },
      padding: 10,
      callbacks: { label: ctx => formatCurrency(ctx.raw) },
    },
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#6b7280', font: { size: 11 } },
    },
    y: {
      grid: { color: '#1f2937' },
      ticks: { color: '#6b7280', font: { size: 11 }, callback: v => '$' + v },
      beginAtZero: true,
    },
  },
}))
</script>

<style scoped>
.month-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.month-scroll::-webkit-scrollbar {
  display: none;
}
</style>
