import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/verify',
    name: 'verify',
    component: () => import('@/views/VerifyPage.vue'),
    meta: { requiresAuth: false, hideTabbar: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/record/intake',
    name: 'record-intake',
    component: () => import('@/views/RecordIntakePage.vue'),
    meta: { requiresAuth: true, hideTabbar: true },
  },
  {
    path: '/record/output',
    name: 'record-output',
    component: () => import('@/views/RecordOutputPage.vue'),
    meta: { requiresAuth: true, hideTabbar: true },
  },
  {
    path: '/records',
    name: 'records',
    component: () => import('@/views/RecordsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/records/:id/edit',
    name: 'edit-record',
    component: () => import('@/views/EditRecordPage.vue'),
    meta: { requiresAuth: true, hideTabbar: true },
  },
  {
    path: '/voice',
    name: 'voice',
    component: () => import('@/views/VoicePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/StatisticsPage.vue'),
    meta: { requiresAuth: true, hideTabbar: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Check if route requires auth
  if (to.meta.requiresAuth !== false) {
    // Check if user is verified
    if (!authStore.checkAuth()) {
      // Redirect to verify with original path
      next({
        path: '/verify',
        query: { redirect: to.fullPath },
      })
      return
    }
  }

  // If verified and going to verify page, redirect to home
  if (to.path === '/verify' && authStore.checkAuth()) {
    next({ path: '/' })
    return
  }

  next()
})

export default router
