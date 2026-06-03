import { http } from '../index'

export interface ProjectBreakdown {
  projectCode: string
  projectName: string
  total: number
  unit: string
  count: number
  percentage: number
}

export interface DailyStats {
  date: string
  intakeTotal: number
  outputTotal: number
  balance: number
  intakeBreakdown: ProjectBreakdown[]
  outputBreakdown: ProjectBreakdown[]
}

export interface PatientStats {
  patientId: string
  patientName: string
  bedNumber: string
  dailyStats: DailyStats[]
  period: {
    start: string
    end: string
  }
}

export interface StatsQueryParams {
  startDate?: string
  endDate?: string
  period?: '24h' | 'today' | 'week'
}

/**
 * Get daily statistics for a patient
 */
export function getDailyStats(patientId: string, params?: StatsQueryParams) {
  return http.get<DailyStats>(`/statistics/patient/${patientId}/daily`, { params })
}

/**
 * Get patient statistics over a period
 */
export function getPatientStats(patientId: string, params?: StatsQueryParams) {
  return http.get<PatientStats>(`/statistics/patient/${patientId}`, { params })
}
