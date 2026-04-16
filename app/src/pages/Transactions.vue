<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="type in txTypes"
        :key="type.value"
        @click="activeFilter = type.value"
        :class="[
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          activeFilter === type.value
            ? 'bg-pink-500 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        ]"
      >
        {{ type.label }}
        <span class="ml-1 opacity-70">{{ type.count }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
      </svg>
      <input
        v-model="search"
        type="text"
        placeholder="Search by creator..."
        class="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors"
      />
    </div>

    <!-- Count -->
    <p class="text-xs text-gray-600">{{ filteredTransactions.length }} transactions</p>

    <!-- List -->
    <div class="space-y-2">
      <TransactionRow
        v-for="tx in filteredTransactions"
        :key="tx.id"
        :tx="tx"
      />
      <p v-if="filteredTransactions.length === 0" class="text-center text-gray-600 py-12">
        No matching transactions
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import TransactionRow from '../components/TransactionRow.vue'
import { transactions, getTxType } from '../composables/useTransactions'

const route = useRoute()
const activeFilter = ref('all')
const search = ref(route.query.q || '')

const txTypes = computed(() => {
  const counts = { all: transactions.value.length, tip: 0, subscription: 0, topup: 0, payment: 0, other: 0 }
  for (const tx of transactions.value) counts[getTxType(tx)]++
  return [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'tip', label: 'Tips', count: counts.tip },
    { value: 'subscription', label: 'Subscriptions', count: counts.subscription },
    { value: 'payment', label: 'PPV Payments', count: counts.payment },
    { value: 'topup', label: 'Top-ups', count: counts.topup },
  ]
})

const filteredTransactions = computed(() => {
  let list = transactions.value
  if (activeFilter.value !== 'all') {
    list = list.filter(tx => getTxType(tx) === activeFilter.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(tx => {
      const name = tx.user?.name?.toLowerCase() || ''
      const username = tx.user?.username?.toLowerCase() || ''
      const desc = tx.description?.toLowerCase() || ''
      return name.includes(q) || username.includes(q) || desc.includes(q)
    })
  }
  return list
})
</script>
