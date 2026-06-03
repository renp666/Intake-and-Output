import api from '../index'

export interface Bed {
  id: number
  number: string
  departmentId: number
  status: 'free' | 'occupied'
  patientId: number | null
  patientName: string | null
  hospitalNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface BedListParams {
  page?: number
  pageSize?: number
  departmentId?: number
  status?: 'free' | 'occupied' | 'all'
}

export interface BedListResponse {
  items: Bed[]
  total: number
}

export const bedsApi = {
  list(params?: BedListParams) {
    return api.get<any, BedListResponse>('/beds', { params })
  },

  getById(id: number) {
    return api.get<any, Bed>(`/beds/${id}`)
  },

  create(data: Partial<Bed>) {
    return api.post<any, Bed>('/beds', data)
  },

  update(id: number, data: Partial<Bed>) {
    return api.put<any, Bed>(`/beds/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/beds/${id}`)
  },

  bind(id: number, data: { patientId: number }) {
    return api.post(`/beds/${id}/bind`, data)
  },

  unbind(id: number) {
    return api.post(`/beds/${id}/unbind`)
  },

  getQRCode(id: number) {
    return api.get<any, { qrCode: string }>(`/beds/${id}/qrcode`)
  }
}