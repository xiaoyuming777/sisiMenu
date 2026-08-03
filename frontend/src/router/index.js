import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import Stats from '../views/Stats.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/search', name: 'Search', component: Search },
  { path: '/stats', name: 'Stats', component: Stats },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
