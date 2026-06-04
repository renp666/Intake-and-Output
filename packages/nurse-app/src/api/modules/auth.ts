import api from '../index'
import type { ApiResponse } from '../index'

export interface LoginParams {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  name: string
  role: 'admin' | 'nurse'
  departmentId: number
  departmentName: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

export const authApi = {
  login(data: LoginParams) {
    return api.post<any, ApiResponse<LoginResponse>>('/auth/login', data)
  },

  logout() {
    return api.post('/auth/logout')
  },

  getCurrentUser() {
    return api.get<any, ApiResponse<UserInfo>>('/auth/me')
  },

  changePassword(data: { oldPassword: string; newPassword: string }) {
    return api.put('/auth/password', data)
  }
}