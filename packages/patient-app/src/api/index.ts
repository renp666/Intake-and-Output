import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { showToast } from 'vant'

// Create axios instance
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add device fingerprint to headers
    const deviceId = localStorage.getItem('patient_device_id')
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId
    }

    // Add auth token if exists
    const token = sessionStorage.getItem('patient_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response

    // Check if response has success field (API standard)
    if (data && typeof data.success === 'boolean') {
      if (data.success) {
        return data.data !== undefined ? data.data : data
      } else {
        const message = data.error?.message || data.message || '请求失败'
        showToast(message)
        return Promise.reject(new Error(message))
      }
    }

    // Direct data response
    return data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      let message = '请求失败'

      switch (status) {
        case 400:
          message = data?.error?.message || '请求参数错误'
          break
        case 401:
          message = '身份验证失败，请重新验证'
          // Clear auth state
          sessionStorage.removeItem('patient_token')
          sessionStorage.removeItem('patient_info')
          // Redirect to verify page
          window.location.href = '/verify'
          break
        case 403:
          message = '没有权限执行此操作'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 409:
          message = data?.error?.message || '数据冲突'
          break
        case 422:
          message = data?.error?.message || '数据验证失败'
          break
        case 500:
          message = '服务器内部错误，请稍后重试'
          break
        default:
          message = data?.error?.message || `请求失败 (${status})`
      }

      showToast(message)
      return Promise.reject(new Error(message))
    }

    if (error.request) {
      showToast('网络连接失败，请检查网络')
      return Promise.reject(new Error('网络连接失败'))
    }

    showToast('请求失败，请稍后重试')
    return Promise.reject(error)
  }
)

// Helper methods
export const http = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>
  },
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>
  },
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>
  },
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>
  },
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>
  },
}

export default instance
