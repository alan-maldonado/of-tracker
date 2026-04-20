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
        <button
          @click="openModal"
          :disabled="importing"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="text-sm text-white">{{ importing ? 'Importing…' : 'Import JSON' }}</span>
        </button>

        <!-- Export to file -->
        <button
          @click="onExport"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span class="text-sm text-white">Export to file</span>
        </button>

        <!-- Copy to clipboard -->
        <button
          @click="onCopy"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="text-sm text-white">{{ copied ? 'Copied!' : 'Copy to clipboard' }}</span>
        </button>

        <!-- Copy scraper script -->
        <button
          @click="onCopyScript"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          <span class="text-sm text-white">{{ copiedScript ? 'Copied!' : 'Copy scraper script' }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <!-- Import Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 class="text-white font-semibold">Import Transactions</h2>
            <button @click="closeModal" class="text-gray-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-700">
            <button
              v-for="t in ['file', 'paste']"
              :key="t"
              @click="tab = t"
              :class="[
                'flex-1 py-3 text-sm font-medium transition-colors',
                tab === t
                  ? 'text-pink-400 border-b-2 border-pink-400'
                  : 'text-gray-400 hover:text-gray-200'
              ]"
            >
              {{ t === 'file' ? 'Upload file' : 'Paste JSON' }}
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <!-- File tab -->
            <div v-if="tab === 'file'">
              <label
                class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-600 hover:border-pink-400 rounded-xl p-10 cursor-pointer transition-colors group"
                :class="{ 'pointer-events-none opacity-50': importing }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-500 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div class="text-center">
                  <p class="text-sm text-gray-300">{{ fileName || 'Click to select a JSON file' }}</p>
                  <p class="text-xs text-gray-500 mt-1">onlyfans_transactions_*.json</p>
                </div>
                <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileChange" :disabled="importing" />
              </label>
            </div>

            <!-- Paste tab -->
            <div v-if="tab === 'paste'">
              <textarea
                v-model="pasteText"
                placeholder="Paste JSON array here…"
                class="w-full h-48 bg-gray-800 border border-gray-700 focus:border-pink-400 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none font-mono transition-colors"
                :disabled="importing"
              />
            </div>

            <!-- Error -->
            <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              :disabled="importing"
            >
              Cancel
            </button>
            <button
              @click="onImport"
              :disabled="importing || !canImport"
              class="px-5 py-2 text-sm font-medium bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg transition-colors"
            >
              {{ importing ? 'Importing…' : 'Import' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { transactions, importTransactions } from '../composables/useTransactions'

const open        = ref(false)
const copied      = ref(false)
const copiedScript = ref(false)
const modal    = ref(false)
const tab      = ref('file')
const error    = ref('')
const importing = ref(false)
const pasteText = ref('')
const fileName  = ref('')
const fileData  = ref(null)
const fileInput = ref(null)
const container = ref(null)

const canImport = computed(() => tab.value === 'file' ? !!fileData.value : pasteText.value.trim().length > 0)

function openModal() {
  open.value = false
  tab.value = 'file'
  error.value = ''
  pasteText.value = ''
  fileName.value = ''
  fileData.value = null
  modal.value = true
}

function closeModal() {
  if (importing.value) return
  modal.value = false
}

function onClickOutside(e) {
  if (container.value && !container.value.contains(e.target)) open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})

async function onFileChange(e) {
  error.value = ''
  const file = e.target.files[0]
  if (!file) return

  const text = await file.text().catch(() => null)
  if (!text) { error.value = 'Could not read file'; return }

  try {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error()
    fileData.value = data
    fileName.value = `${file.name} (${data.length} transactions)`
  } catch {
    error.value = 'Invalid JSON — must be an array'
    fileData.value = null
    fileName.value = ''
  }
}

async function onImport() {
  error.value = ''
  let data

  if (tab.value === 'file') {
    data = fileData.value
  } else {
    try {
      data = JSON.parse(pasteText.value.trim())
      if (!Array.isArray(data)) throw new Error()
    } catch {
      error.value = 'Invalid JSON — must be an array'
      return
    }
  }

  importing.value = true
  try {
    const { inserted } = await importTransactions(data)
    console.log(`[Import] ${inserted} transactions saved`)
    closeModal()
  } catch (err) {
    error.value = err.message || 'Import failed'
  } finally {
    importing.value = false
  }
}

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

async function onCopyScript() {
  try {
    const res = await fetch('/api/scraper-script')
    if (!res.ok) throw new Error('Could not fetch script')
    const script = await res.text()
    const full = `window.data = ${JSON.stringify(transactions.value)}\n\n${script}`
    await writeToClipboard(full)
    copiedScript.value = true
    setTimeout(() => { copiedScript.value = false }, 2000)
    open.value = false
  } catch (e) {
    console.error('[CopyScript]', e.message)
  }
}

async function onCopy() {
  try {
    await writeToClipboard(JSON.stringify(transactions.value))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
    open.value = false
  } catch (e) {
    console.error('[Copy]', e.message)
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

.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
