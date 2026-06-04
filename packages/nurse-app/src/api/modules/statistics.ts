import api from '../index'

export interface DailyStatistics {
  date: string
  patientId: string | null
  patientName: string
  hospitalNumber: string
  bedNumber: string
  intake: {
    total: number
    items: Array<{
      itemId: string
      itemName: string
      amount: number
      unit: string
    }>
  }
  output: {
    total: number
    items: Array<{
      itemId: string
      itemName: string
      amount: number
      unit: string
    }>
  }
  balance: number
  shiftSummaries: Array<{
    shiftId: string
    shiftName: string
    intake: number
    output: number
    balance: number
  }>
}

export interface StatisticsParams {
  patientId?: string
  bedNumber?: string
  startDate?: string
  endDate?: string
  shiftId?: string
  type?: '24h' | 'custom'
}

export interface PatientStatistics {
  patientId: string
  patientName: string
  hospitalNumber: string
  totalIntake: number
  totalOutput: number
  balance: number
  days: number
  dailyAverages: {
    intake: number
    output: number
    balance: number
  }
}

export interface ShiftStatistics {
  shiftId: string
  shiftName: string
  startTime: string
  endTime: string
  intake: number
  output: number
  balance: number
  records: Array<{
    itemId: string
    itemName: string
    type: 'intake' | 'output'
    amount: number
    unit: string
  }>
}

export const statisticsApi = {
  daily(params?: StatisticsParams) {
    return api.get('/statistics/daily', { params })
  },

  custom(params?: StatisticsParams) {
    return api.get('/statistics/custom', { params })
  },

  patient(patientId: string, params?: Omit<StatisticsParams, 'patientId'>) {
    return api.get<any, PatientStatistics>(`/statistics/patient/${patientId}`, { params })
  },

  shift(params?: StatisticsParams) {
    return api.get<any, ShiftStatistics[]>('/statistics/shift', { params })
  },

  exportData(params?: StatisticsParams & { format: 'excel' | 'pdf' }) {
    return api.get('/statistics/export', {
      params,
      responseType: 'blob'
    })
  }
}
