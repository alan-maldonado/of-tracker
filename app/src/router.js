import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import Transactions from './pages/Transactions.vue'
import Monthly from './pages/Monthly.vue'
import Profile from './pages/Profile.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/transactions', component: Transactions },
    { path: '/monthly', component: Monthly },
    { path: '/profile/:username', component: Profile },
  ],
})
