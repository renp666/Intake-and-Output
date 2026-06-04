import api from '../index'
import {
  buildCreateBedPayload,
  buildUpdateBedPayload,
  mapBed
} from './bed-transforms.js'

export interface Bed {
  id: string
  number: string
  departmentId: string
  status: 'free' | 'occupied'
  patientId: string | null
  patientName: string | null
  hospitalNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface BedListParams {
  page?: number
  pageSize?: number
  departmentId?: string
  status?: 'free' | 'occupied' | 'all'
}

export interface BedListResponse {
  items: Bed[]
  total: number
}

export const bedsApi = {
  list(params?: BedListParams) {
    return api.get('/beds', { params }).then((res: any) => ({
      items: (res?.items || []).map(mapBed),
      total: res?.total || 0
    }))
  },

  getById(id: string) {
    return api.get(`/beds/${id}`).then((res: any) => mapBed(res))
  },

  create(data: Partial<Bed>) {
    return api.post('/beds', buildCreateBedPayload({
      number: data.number || '',
      departmentId: data.departmentId || ''
    })).then((res: any) => mapBed(res))
  },

  update(id: string, data: Partial<Bed>) {
    return api.put(`/beds/${id}`, buildUpdateBedPayload({
      number: data.number,
      departmentId: data.departmentId
    })).then((res: any) => mapBed(res))
  },

  delete(id: string) {
    return api.delete(`/beds/${id}`)
  },

  bind(id: string, data: { patientId: string }) {
    return api.post(`/beds/${id}/bind`, data)
  },

  unbind(id: string) {
    return api.post(`/beds/${id}/unbind`)
  },

  getQRCode(id: string) {
    return api.get<any, { qrCode: string }>(`/beds/${id}/qrcode`)
  }
}
