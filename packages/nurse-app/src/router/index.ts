import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardPage.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('@/views/RecordsPage.vue'),
        meta: { title: '记录查询' }
      },
      {
        path: 'patients',
        name: 'Patients',
        component: () => import('@/views/PatientsPage.vue'),
        meta: { title: '病人管理' }
      },
      {
        path: 'beds',
        name: 'Beds',
        component: () => import('@/views/BedsPage.vue'),
        meta: { title: '床位管理' }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/StatisticsPage.vue'),
        meta: { title: '统计' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SettingsPage.vue'),
        meta: { title: '系统设置', requiresAdmin: true },
        children: [
          {
            path: '',
            redirect: '/settings/departments'
          },
          {
            path: 'departments',
            name: 'Departments',
            component: () => import('@/views/settings/DepartmentsPage.vue'),
            meta: { title: '科室管理', requiresAdmin: true }
          },
          {
            path: 'users',
            name: 'Users',
            component: () => import('@/views/settings/UsersPage.vue'),
            meta: { title: '用户管理', requiresAdmin: true }
          },
          {
            path: 'preset-items',
            name: 'PresetItems',
            component: () => import('@/views/settings/PresetItemsPage.vue'),
            meta: { title: '预设项目', requiresAdmin: true }
          },
          {
            path: 'system',
            name: 'SystemConfig',
            component: () => import('@/views/settings/SystemConfigPage.vue'),
            meta: { title: '系统配置', requiresAdmin: true }
          },
          {
            path: 'shifts',
            name: 'Shifts',
            component: () => import('@/views/settings/ShiftsPage.vue'),
            meta: { title: '班次配置', requiresAdmin: true }
          },
          {
            path: 'logs',
            name: 'Logs',
            component: () => import('@/views/settings/LogsPage.vue'),
            meta: { title: '操作日志', requiresAdmin: true }
          }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth === false) {
    if (authStore.token && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
    return
  }

  if (!authStore.token) {
    next('/login')
    return
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/dashboard')
    return
  }

  next()
})

export default router