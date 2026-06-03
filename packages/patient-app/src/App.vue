<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Bottom Tab Bar -->
    <van-tabbar
      v-if="showTabbar"
      v-model="activeTab"
      :fixed="true"
      :border="true"
      :safe-area-inset-bottom="true"
      active-color="#1890FF"
      inactive-color="#999999"
      @change="onTabChange"
    >
      <van-tabbar-item name="home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item name="records" icon="orders-o">记录</van-tabbar-item>
      <van-tabbar-item name="voice" icon="chat-o">语音</van-tabbar-item>
      <van-tabbar-item name="settings" icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Tab mapping
const tabRouteMap: Record<string, string> = {
  home: '/',
  records: '/records',
  voice: '/voice',
  settings: '/settings',
}

const routeTabMap: Record<string, string> = {
  '/': 'home',
  '/records': 'records',
  '/voice': 'voice',
  '/settings': 'settings',
}

const activeTab = ref('home')

// Show tabbar based on route meta
const showTabbar = computed(() => {
  return !route.meta.hideTabbar && authStore.isVerified
})

// Watch route changes to update active tab
watch(
  () => route.path,
  (path) => {
    const tab = routeTabMap[path]
    if (tab) {
      activeTab.value = tab
    }
  },
  { immediate: true }
)

// Handle tab change
function onTabChange(name: string | number) {
  const path = tabRouteMap[name as string]
  if (path && route.path !== path) {
    router.push(path)
  }
}
</script>

<style>
#app {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #F5F5F5;
}
</style>
