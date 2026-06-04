import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserInfo, type LoginParams } from '@/api/modules/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UserInfo | null>(null)

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isNurse = computed(() => user.value?.role === 'nurse')

  const initUser = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch (e) {
        user.value = null
      }
    }
  }

  initUser()

  const login = async (params: LoginParams) => {
    const res = await authApi.login(params)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // ignore error
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await authApi.getCurrentUser()
      user.value = res as UserInfo
      localStorage.setItem('user', JSON.stringify(res))
      return res
    } catch (e) {
      throw e
    }
  }

  return {
    token,
    user,
    isAdmin,
    isNurse,
    login,
    logout,
    fetchCurrentUser
  }
})