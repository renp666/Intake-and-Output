import api from '../index'

export interface IntakeOutputRecord {
  id: number
  patientId: number
  patientName: string
  hospitalNumber: string
  bedId: number | null
  bedNumber: string | null
  type: 'intake' | 'output'
  itemId: number
  itemName: string
  amount: number
  unit: string
  recordTime: string
  status: 'pending' | 'confirmed' | 'deleted'
  confirmedBy: string | null
  confirmedAt: string | null
  operatorName: string
  notes: string | null
  departmentId: number
  createdAt: string
  updatedAt: string
}

export interface RecordListParams {
  page?: number
  pageSize?: number
  patientId?: number
  bedId?: number
  type?: 'intake' | 'output' | 'all'
  status?: 'pending' | 'confirmed' | 'deleted' | 'all'
  startTime?: string
  endTime?: string
  keyword?: string
}

export interface RecordListResponse {
  items: IntakeOutputRecord[]
  total: number
}

export interface RecordHistory {
  id: number
  recordId: number
  action: 'create' | 'update' | 'confirm' | 'unconfirm' | 'delete' | 'restore'
  operatorName: string
  detail: string
  createdAt: string
}

export const recordsApi = {
  list(params?: RecordListParams) {
    return api.get<any, RecordListResponse>('/records', { params })
  },

  getById(id: number) {
    return api.get<any, IntakeOutputRecord>(`/records/${id}`)
  },

  create(data: Partial<IntakeOutputRecord>) {
    return api.post<any, IntakeOutputRecord>('/records', data)
  },

  update(id: number, data: Partial<IntakeOutputRecord>) {
    return api.put<any, IntakeOutputRecord>(`/records/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/records/${id}`)
  },

  confirm(id: number, data: { operatorName: string }) {
    return api.post(`/records/${id}/confirm`, data)
  },

  batchConfirm(ids: number[], data: { operatorName: string }) {
    return api.post('/records/batch-confirm', { ids, ...data })
  },

  unconfirm(id: number) {
    return api.post(`/records/${id}/unconfirm`)
  },

  restore(id: number) {
    return api.post(`/records/${id}/restore`)
  },

  getHistory(id: number) {
    return api.get<any, RecordHistory[]>(`/records/${id}/history`)
  },

  getPendingCount() {
    return api.get<any, { count: number }>('/records/pending-count')
  },

  getTodaySummary() {
    return api.get<any, { intake: number; output: number }>('/records/today-summary')
  }
}