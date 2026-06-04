import api from '../index'

export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'nurse'
  departmentId: number
  departmentName: string
  status: 'active' | 'inactive'
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  search?: string
  role?: 'admin' | 'nurse' | 'all'
  departmentId?: number
  status?: 'active' | 'inactive' | 'all'
}

export interface UserListResponse {
  items: User[]
  total: number
}

export const usersApi = {
  list(params?: UserListParams) {
    return api.get<any, UserListResponse>('/users', { params })
  },

  getById(id: number) {
    return api.get<any, User>(`/users/${id}`)
  },

  create(data: Partial<User> & { password: string }) {
    return api.post<any, User>('/users', data)
  },

  update(id: number, data: Partial<User>) {
    return api.put<any, User>(`/users/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/users/${id}`)
  },

  resetPassword(id: number, data: { newPassword: string }) {
    return api.post(`/users/${id}/reset-password`, data)
  },

  toggleStatus(id: number, isActive: boolean) {
    return api.put(`/users/${id}`, { isActive })
  }
}