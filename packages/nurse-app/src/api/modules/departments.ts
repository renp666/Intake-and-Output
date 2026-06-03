import api from '../index'

export interface Department {
  id: number
  name: string
  code: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export const departmentsApi = {
  list() {
    return api.get<any, Department[]>('/departments')
  },

  getById(id: number) {
    return api.get<any, Department>(`/departments/${id}`)
  },

  create(data: Partial<Department>) {
    return api.post<any, Department>('/departments', data)
  },

  update(id: number, data: Partial<Department>) {
    return api.put<any, Department>(`/departments/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/departments/${id}`)
  }
}