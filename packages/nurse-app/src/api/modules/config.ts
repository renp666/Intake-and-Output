import api from '../index'

export interface SystemConfig {
  id: number
  key: string
  value: string
  description: string
  updatedAt: string
}

export interface Shift {
  id: number
  name: string
  startTime: string
  endTime: string
  isDefault: boolean
  departmentId: number
  createdAt: string
  updatedAt: string
}

export const configApi = {
  getSystemConfig() {
    return api.get<any, SystemConfig[]>('/config/system')
  },

  updateSystemConfig(data: { key: string; value: string }) {
    return api.put('/config/system', data)
  },

  getShifts() {
    return api.get<any, Shift[]>('/config/shifts')
  },

  createShift(data: Partial<Shift>) {
    return api.post<any, Shift>('/config/shifts', data)
  },

  updateShift(id: number, data: Partial<Shift>) {
    return api.put<any, Shift>(`/config/shifts/${id}`, data)
  },

  deleteShift(id: number) {
    return api.delete(`/config/shifts/${id}`)
  }
}