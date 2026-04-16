<template>
  <div class="relative" ref="container">
    <button
      @click="open = !open"
      class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-pink-400 hover:bg-gray-800 transition-colors"
      title="Import / Export"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-52 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-50"
      >
        <!-- Import -->
        <label
          :class="[
            'flex items-center gap-3 px-4 py-3 transition-colors',
            importing ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-700 cursor-pointer'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="text-sm text-white">{{ importing ? 'Importing…' : 'Import JSON' }}</span>
          <input type="file" accept=".json" class="hidden" @change="onImport" :disabled="importing" />
        </label>

        <!-- Export -->
        <button
          @click="onExport"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span class="text-sm text-white">Export JSON</span>
        </button>

        <!-- Error -->
        <p v-if="error" class="px-4 py-2 text-xs text-red-400 border-t border-gray-700">{{ error }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { transactions, importTransactions } from '../composables/useTransactions'

const open = ref(false)
const error = ref('')
const importing = ref(false)
const container = ref(null)

function onClickOutside(e) {
  if (container.value && !container.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

async function onImport(e) {
  error.value = ''
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''

  const text = await file.text().catch(() => null)
  if (!text) { error.value = 'Could not read file'; return }

  let data
  try {
    data = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error()
  } catch {
    error.value = 'Invalid JSON — must be an array'
    return
  }

  importing.value = true
  try {
    const { inserted } = await importTransactions(data)
    open.value = false
    console.log(`[Import] ${inserted} transactions saved`)
  } catch (err) {
    error.value = err.message || 'Import failed'
  } finally {
    importing.value = false
  }
}

function onExport() {
  const blob = new Blob([JSON.stringify(transactions.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions_${transactions.value.length}.json`
  a.click()
  URL.revokeObjectURL(url)
  open.value = false
}
</script>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-leave-active { transition: opacity 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
