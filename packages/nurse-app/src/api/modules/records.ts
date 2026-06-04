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
  bedNumber?: string
  recordType?: 'intake' | 'output'
  status?: 'pending' | 'confirmed' | 'deleted'
  startDate?: string
  endDate?: string
  search?: string
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

function mapRecordFromApi(raw: any): IntakeOutputRecord {
  return {
    id: raw.id,
    patientId: raw.patientId,
    patientName: raw.patient?.name || '',
    hospitalNumber: raw.hospitalNumber,
    bedId: null,
    bedNumber: raw.bedNumber,
    type: raw.recordType,
    itemId: 0,
    itemName: raw.itemName,
    amount: raw.amount,
    unit: raw.unit,
    recordTime: raw.recordTime,
    status: raw.isDeleted ? 'deleted' : (raw.confirmedAt ? 'confirmed' : 'pending'),
    confirmedBy: raw.confirmer?.name || null,
    confirmedAt: raw.confirmedAt || null,
    operatorName: raw.recorder?.name || '',
    notes: raw.notes || null,
    departmentId: 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  }
}

export const recordsApi = {
  list(params?: RecordListParams) {
    return api.get<any, RecordListResponse>('/records', { params }).then((res: any) => ({
      items: (res.items || []).map(mapRecordFromApi),
      total: res.total || 0
    }))
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
    return api.post(`/records/${id}/confirm`, { operator_name: data.operatorName })
  },

  batchConfirm(ids: number[], data: { operatorName: string }) {
    return api.post('/records/batch-confirm', { ids, operator_name: data.operatorName })
  },

  unconfirm(id: number, data?: { operatorName: string }) {
    return api.post(`/records/${id}/unconfirm`, data ? { operator_name: data.operatorName } : {})
  },

  restore(id: number, data?: { operatorName: string }) {
    return api.post(`/records/${id}/restore`, data ? { operator_name: data.operatorName } : {})
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