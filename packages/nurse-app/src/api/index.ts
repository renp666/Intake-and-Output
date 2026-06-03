import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useMessage } from 'naive-ui'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }

      const message = data?.message || '请求失败'
      return Promise.reject(new Error(message))
    }

    if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'))
    }

    return Promise.reject(error)
  }
)

export default api