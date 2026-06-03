import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const currentDepartment = ref<string>('')

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
  }

  const setCurrentDepartment = (name: string) => {
    currentDepartment.value = name
  }

  return {
    sidebarCollapsed,
    currentDepartment,
    toggleSidebar,
    setSidebarCollapsed,
    setCurrentDepartment
  }
})