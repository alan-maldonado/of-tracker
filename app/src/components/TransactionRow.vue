<template>
  <div class="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-gray-700 transition-colors">
    <!-- Avatar -->
    <component
      :is="profileRoute ? 'RouterLink' : 'div'"
      :to="profileRoute || undefined"
      class="relative shrink-0"
    >
      <img
        v-if="avatar"
        :src="avatar"
        class="w-10 h-10 rounded-full object-cover"
        :class="profileRoute ? 'hover:ring-2 hover:ring-pink-500/60 transition-all' : ''"
        :alt="tx.user?.name"
      />
      <div
        v-else
        class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-medium"
      >
        {{ initials }}
      </div>
      <span class="absolute -bottom-0.5 -right-0.5 text-xs leading-none">{{ typeEmoji }}</span>
    </component>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <RouterLink
          v-if="profileRoute"
          :to="profileRoute"
          class="text-sm font-medium text-white truncate hover:text-pink-400 transition-colors"
        >{{ displayName }}</RouterLink>
        <span v-else class="text-sm font-medium text-white truncate">{{ displayName }}</span>
        <span v-if="tx.user?.isVerified" class="text-blue-400 text-xs" title="Verified">✓</span>
      </div>
      <p class="text-xs text-gray-500 truncate mt-0.5">{{ cleanDescription }}</p>
    </div>

    <!-- Right side -->
    <div class="text-right shrink-0">
      <p :class="['text-sm font-semibold', amountColor]">
        {{ isTopup ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
      </p>
      <p class="text-xs text-gray-600 mt-0.5">{{ formattedDate }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  tx: Object,
  hideLink: { type: Boolean, default: false },
})

const tx = props.tx

function getTxType(tx) {
  const desc = tx.description || ''
  if (desc.includes('Tip')) return 'tip'
  if (desc.includes('Subscription') || desc.includes('Recurring')) return 'subscription'
  if (desc.includes('Wallet top-up')) return 'topup'
  if (desc.includes('Payment')) return 'payment'
  return 'other'
}

const txType = computed(() => getTxType(tx))
const isTopup = computed(() => txType.value === 'topup')

const avatar = computed(() => tx.user?.avatarThumbs?.c50 || tx.user?.avatar || null)

const initials = computed(() => {
  const name = tx.user?.name || '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})

const displayName = computed(() => {
  if (isTopup.value) return tx.user?.name || 'Wallet Top-up'
  return tx.user?.name || 'Unknown'
})

const profileRoute = computed(() => {
  const username = tx.user?.username
  if (!username || isTopup.value || props.hideLink) return null
  return `/profile/${username}`
})

const cleanDescription = computed(() => {
  if (!tx.description) return ''
  return tx.description.replace(/<[^>]+>/g, '').trim()
})

const typeEmoji = computed(() => {
  const map = { tip: '💝', subscription: '📬', topup: '💳', payment: '🎬', other: '💰' }
  return map[txType.value] || '💰'
})

const amountColor = computed(() => {
  if (isTopup.value) return 'text-green-400'
  return 'text-red-400'
})

function formatCurrency(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

const formattedDate = computed(() => {
  if (!tx.createdAt) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(tx.createdAt))
})
</script>
