<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <header class="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-14">

          <!-- Logo + Nav -->
          <div class="flex items-center gap-4">
            <RouterLink to="/" class="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
              <img src="/logo.svg" class="w-8 h-8" alt="OF Tracker" />
              <span class="font-semibold text-white text-sm hidden sm:block">Transaction Tracker</span>
            </RouterLink>
            <nav class="flex items-center gap-1">
              <RouterLink
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  $route.path === link.to
                    ? 'bg-pink-500/20 text-pink-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                ]"
              >{{ link.label }}</RouterLink>

              <a
                href="http://zima.local:6906"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
              >Backup</a>
            </nav>
          </div>

          <!-- Actions (far right) -->
          <div class="flex items-center gap-1">
          <!-- Search (far right) -->
          <div class="relative flex items-center gap-2" ref="searchContainer" @mouseenter="openSearch" @mouseleave="onMouseLeave">
            <!-- Icon always visible -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 transition-colors" :class="expanded ? 'text-pink-400' : 'text-gray-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>

            <!-- Expanding input -->
            <div class="search-input-wrap" :class="{ expanded }">
              <input
                ref="inputEl"
                v-model="search"
                type="text"
                placeholder="Search creator..."
                class="search-input text-sm text-gray-100 placeholder-gray-600 focus:outline-none bg-transparent"
                @keydown.escape="closeSearch"
                @keydown.enter="goToFirst"
                @keydown.tab.prevent="goToFirst"
              />
            </div>

            <!-- Close button -->
            <Transition name="fade-x">
              <button v-if="expanded" @click="closeSearch" class="text-gray-500 hover:text-white transition-colors text-xs shrink-0">✕</button>
            </Transition>

            <Transition name="dropdown">
              <div
                v-if="expanded && search"
                class="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl"
              >
                <template v-if="searchResults.length">
                  <RouterLink
                    v-for="c in searchResults"
                    :key="c.username"
                    :to="`/profile/${c.username}`"
                    @click="closeSearch"
                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors"
                  >
                    <img v-if="c.avatar" :src="c.avatar" class="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div v-else class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-400 shrink-0">{{ c.name?.[0] }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ c.name }}</p>
                      <p class="text-xs text-gray-500">@{{ c.username }}</p>
                    </div>
                    <span class="text-sm text-pink-400 shrink-0">{{ formatCurrency(c.total) }}</span>
                  </RouterLink>
                </template>
                <p v-else class="px-4 py-3 text-sm text-gray-500">No results</p>
              </div>
            </Transition>
          </div>
          <ImportExport />

          <!-- Sync backup profiles -->
          <button
            @click="runSync"
            :disabled="syncing"
            :title="syncLabel || 'Sync backup profiles'"
            class="p-1.5 rounded-lg transition-colors shrink-0"
            :class="syncing ? 'text-gray-600 cursor-not-allowed' : syncError ? 'text-red-400 hover:text-red-300' : syncDone ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-white'"
          >
            <svg v-if="syncing" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          </div>

        </div>
      </div>
    </header>

    <!-- Loading / error state -->
    <div v-if="isLoading" class="flex items-center justify-center py-24 gap-3 text-gray-500">
      <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span class="text-sm">Loading transactions…</span>
    </div>
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-24 gap-2 text-gray-500">
      <p class="text-sm text-red-400">Could not reach the server — is it running?</p>
      <code class="text-xs text-gray-600">{{ loadError }}</code>
    </div>

    <main v-else class="max-w-7xl mx-auto px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { formatCurrency, useTransactions, isLoading, loadError, loadBackupProfiles } from './composables/useTransactions'
import ImportExport from './components/ImportExport.vue'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/monthly', label: 'Monthly' },
]

const router = useRouter()
const { allCreators } = useTransactions()

const syncing   = ref(false)
const syncDone  = ref(false)
const syncError = ref(false)
const syncLabel = ref('')

async function runSync() {
  if (syncing.value) return
  syncing.value   = true
  syncDone.value  = false
  syncError.value = false
  syncLabel.value = ''
  try {
    await loadBackupProfiles()
    syncDone.value  = true
    syncLabel.value = 'Backup profiles synced'
    setTimeout(() => { syncDone.value = false }, 4000)
  } catch (e) {
    syncError.value = true
    syncLabel.value = e.message
    setTimeout(() => { syncError.value = false }, 5000)
  } finally {
    syncing.value = false
  }
}

const expanded = ref(false)
const search = ref('')
const inputEl = ref(null)
const searchContainer = ref(null)

async function openSearch() {
  expanded.value = true
  await nextTick()
  inputEl.value?.focus()
}

function closeSearch() {
  expanded.value = false
  search.value = ''
}

function goToFirst() {
  if (!searchResults.value.length) return
  router.push(`/profile/${searchResults.value[0].username}`)
  closeSearch()
}

function onMouseLeave() {
  if (document.activeElement !== inputEl.value) closeSearch()
}

function onClickOutside(e) {
  if (searchContainer.value && !searchContainer.value.contains(e.target)) closeSearch()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

const searchResults = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return []
  return allCreators.value
    .filter(c => c.name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q))
    .slice(0, 7)
})
</script>

<style scoped>
/* Search expand animation */
.search-input-wrap {
  display: flex;
  align-items: center;
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
.search-input-wrap.expanded {
  width: 200px;
  opacity: 1;
}
.search-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid #4b5563;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: #ec4899;
}

/* Existing dropdown transition */
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-leave-active { transition: opacity 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* Close button fade */
.fade-x-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-x-leave-active { transition: opacity 0.1s ease; }
.fade-x-enter-from, .fade-x-leave-to { opacity: 0; transform: scale(0.8); }
</style>

