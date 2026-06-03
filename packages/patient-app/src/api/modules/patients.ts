import { http } from '../index'
import type { PatientInfo } from './auth'

export interface PatientRecord {
  id: string
  patientId: string
  patientName: string
  bedNumber: string
  recordType: 'intake' | 'output'
  projectName: string
  projectCode: string
  amount: number
  unit: string
  recordTime: string
  notes?: string
  status: 'pending' | 'confirmed' | 'deleted'
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface PatientRecordsParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  recordType?: 'intake' | 'output'
  status?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Get patient info by ID
 */
export function getPatient(patientId: string) {
  return http.get<PatientInfo>(`/patients/${patientId}`)
}

/**
 * Get patient records with pagination
 */
export function getPatientRecords(
  patientId: string,
  params?: PatientRecordsParams
) {
  return http.get<PaginatedResponse<PatientRecord>>(`/patients/${patientId}/records`, {
    params,
  })
}
