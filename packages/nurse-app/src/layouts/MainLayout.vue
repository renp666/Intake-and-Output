<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="appStore.sidebarCollapsed"
      show-trigger
      @collapse="appStore.setSidebarCollapsed(true)"
      @expand="appStore.setSidebarCollapsed(false)"
      :native-scrollbar="false"
      style="height: 100vh"
    >
      <div class="logo" :class="{ collapsed: appStore.sidebarCollapsed }">
        <span v-if="!appStore.sidebarCollapsed">出入量记录系统</span>
        <span v-else>IO</span>
      </div>
      <n-menu
        :collapsed="appStore.sidebarCollapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="activeMenu"
        @update:value="handleMenuClick"
      />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered style="height: 64px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between">
        <div style="display: flex; align-items: center; gap: 16px">
          <n-breadcrumb>
            <n-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.title }}
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>
        <div style="display: flex; align-items: center; gap: 16px">
          <n-tag v-if="authStore.user?.departmentName" type="info" size="small">
            {{ authStore.user.departmentName }}
          </n-tag>
          <n-dropdown :options="userMenuOptions" @select="handleUserMenuSelect">
            <n-button quaternary>
              <template #icon>
                <n-icon><UserOutlined /></n-icon>
              </template>
              {{ authStore.user?.name || '用户' }}
            </n-button>
          </n-dropdown>
        </div>
      </n-layout-header>
      <n-layout-content
        content-style="padding: 24px;"
        :native-scrollbar="false"
        style="height: calc(100vh - 64px); background-color: #f5f5f5"
      >
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { h, computed } from 'vue'
import { useRouter, useRoute, type RouteRecordRaw } from 'vue-router'
import { NIcon } from 'naive-ui'
import type { MenuOption, DropdownOption } from 'naive-ui'
import {
  HomeOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  ApartmentOutlined,
  MedicineBoxOutlined,
  UnorderedListOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  AuditOutlined
} from '@vicons/antd'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      label: '首页',
      key: '/dashboard',
      icon: renderIcon(HomeOutlined)
    },
    {
      label: '记录查询',
      key: '/records',
      icon: renderIcon(FileTextOutlined)
    },
    {
      label: '病人管理',
      key: '/patients',
      icon: renderIcon(TeamOutlined)
    },
    {
      label: '床位管理',
      key: '/beds',
      icon: renderIcon(MedicineBoxOutlined)
    },
    {
      label: '统计',
      key: '/statistics',
      icon: renderIcon(BarChartOutlined)
    }
  ]

  if (authStore.isAdmin) {
    options.push({
      label: '系统设置',
      key: '/settings',
      icon: renderIcon(SettingOutlined),
      children: [
        {
          label: '科室管理',
          key: '/settings/departments',
          icon: renderIcon(ApartmentOutlined)
        },
        {
          label: '用户管理',
          key: '/settings/users',
          icon: renderIcon(TeamOutlined)
        },
        {
          label: '预设项目',
          key: '/settings/preset-items',
          icon: renderIcon(UnorderedListOutlined)
        },
        {
          label: '系统配置',
          key: '/settings/system',
          icon: renderIcon(ToolOutlined)
        },
        {
          label: '班次配置',
          key: '/settings/shifts',
          icon: renderIcon(ClockCircleOutlined)
        },
        {
          label: '操作日志',
          key: '/settings/logs',
          icon: renderIcon(AuditOutlined)
        }
      ]
    })
  }

  return options
})

const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const matched = route.matched
  return matched
    .filter(item => item.meta?.title)
    .map(item => ({
      path: item.path,
      title: item.meta.title as string
    }))
})

const userMenuOptions: DropdownOption[] = [
  {
    label: '退出登录',
    key: 'logout'
  }
]

const handleMenuClick = (key: string) => {
  router.push(key)
}

const handleUserMenuSelect = (key: string) => {
  if (key === 'logout') {
    authStore.logout()
  }
}
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
  border-bottom: 1px solid #eee;
}

.logo.collapsed {
  font-size: 16px;
}
</style>