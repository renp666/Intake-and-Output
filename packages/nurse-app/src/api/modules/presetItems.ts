import api from '../index'

export interface PresetItem {
  id: number
  name: string
  type: 'intake' | 'output'
  unit: string
  permission: 'admin' | 'nurse' | 'patient'
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  departmentId: number | null
  createdAt: string
  updatedAt: string
}

export interface PresetItemListParams {
  page?: number
  pageSize?: number
  type?: 'intake' | 'output' | 'all'
  permission?: 'admin' | 'nurse' | 'patient' | 'all'
  isActive?: boolean
  keyword?: string
}

export interface PresetItemListResponse {
  items: PresetItem[]
  total: number
}

export const presetItemsApi = {
  list(params?: PresetItemListParams) {
    return api.get<any, PresetItemListResponse>('/preset-items', { params })
  },

  getById(id: number) {
    return api.get<any, PresetItem>(`/preset-items/${id}`)
  },

  create(data: Partial<PresetItem>) {
    return api.post<any, PresetItem>('/preset-items', data)
  },

  update(id: number, data: Partial<PresetItem>) {
    return api.put<any, PresetItem>(`/preset-items/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/preset-items/${id}`)
  },

  toggle(id: number) {
    return api.post(`/preset-items/${id}/toggle`)
  }
}