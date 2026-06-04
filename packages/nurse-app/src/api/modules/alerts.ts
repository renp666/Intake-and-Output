import api from '../index'

export interface Alert {
  id: number
  patientId: number
  patientName: string
  hospitalNumber: string
  bedNumber: string | null
  type: 'oliguria' | 'polyuria' | 'anuria' | 'imbalance' | 'custom'
  level: 'warning' | 'danger'
  message: string
  threshold: number
  actualValue: number
  isRead: boolean
  handledBy: string | null
  handledAt: string | null
  handleNote: string | null
  createdAt: string
}

export interface AlertListParams {
  page?: number
  pageSize?: number
  patientId?: number
  type?: string
  level?: string
  isRead?: boolean
  startTime?: string
  endTime?: string
}

export interface AlertListResponse {
  items: Alert[]
  total: number
  unreadCount: number
}

export interface AlertConfig {
  oliguriaFactor: number
  defaultThreshold: number
  polyuriaThreshold: number
  anuriaThreshold: number
  imbalanceThreshold: number
  changePercentThreshold: number
}

export interface PatientThreshold {
  id: number
  patientId: number
  patientName: string
  type: string
  threshold: number
  isEnabled: boolean
}

export const alertsApi = {
  list(params?: AlertListParams) {
    return api.get<any, AlertListResponse>('/alerts', { params })
  },

  getById(id: number) {
    return api.get<any, Alert>(`/alerts/${id}`)
  },

  markAsRead(id: number) {
    return api.put(`/alerts/${id}/read`)
  },

  handle(id: number, data: { operatorName: string; note: string }) {
    return api.put(`/alerts/${id}/handle`, { handleNotes: data.note })
  },

  getConfig() {
    return api.get<any, AlertConfig>('/alerts/config')
  },

  updateConfig(data: AlertConfig) {
    return api.put('/alerts/config', data)
  },

  getPatientThresholds(patientId: number) {
    return api.get<any, PatientThreshold[]>(`/alerts/patient-thresholds/${patientId}`)
  },

  updatePatientThresholds(patientId: number, data: Partial<PatientThreshold>[]) {
    return api.put(`/alerts/patient-thresholds/${patientId}`, data)
  }
}