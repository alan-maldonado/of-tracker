<template>
  <div :class="['bg-gray-900 rounded-2xl border p-4', borderColor]">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-lg">{{ icon }}</span>
      <span class="text-xs text-gray-500 font-medium uppercase tracking-wide">{{ label }}</span>
    </div>
    <p :class="['text-xl font-bold', textColor]">{{ value }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  value: String,
  color: String,
  icon: String,
})

const colorMap = {
  pink: { text: 'text-pink-400', border: 'border-pink-500/20' },
  blue: { text: 'text-blue-400', border: 'border-blue-500/20' },
  yellow: { text: 'text-yellow-400', border: 'border-yellow-500/20' },
  purple: { text: 'text-purple-400', border: 'border-purple-500/20' },
}

const textColor = computed(() => colorMap[props.color]?.text || 'text-white')
const borderColor = computed(() => colorMap[props.color]?.border || 'border-gray-800')
</script>
