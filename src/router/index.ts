import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return undefined
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: () => import('../components/SleekPortfolio.vue') },
    { path: '/projects/:slug', name: 'project', component: () => import('../components/SleekPortfolio.vue') },
    { path: '/academics/:year', name: 'academics', component: () => import('../components/SleekPortfolio.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../components/SleekPortfolio.vue') },
  ],
})

export default router
