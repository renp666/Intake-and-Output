import { http } from '../index'
import type { PatientRecord, PaginatedResponse } from './patients'

export interface CreateRecordPayload {
  patientId: string
  recordType: 'intake' | 'output'
  projectName: string
  projectCode: string
  amount: number
  unit: string
  recordTime: string
  notes?: string
  bristolType?: number
  deviceId?: string
}

export interface UpdateRecordPayload {
  projectName?: string
  projectCode?: string
  amount?: number
  unit?: string
  recordTime?: string
  notes?: string
  bristolType?: number
}

export interface RecordsQueryParams {
  patientId?: string
  recordType?: 'intake' | 'output'
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * Create a new record
 */
export function createRecord(data: CreateRecordPayload) {
  return http.post<PatientRecord>('/records', data)
}

/**
 * Get records list with pagination
 */
export function getRecords(params?: RecordsQueryParams) {
  return http.get<PaginatedResponse<PatientRecord>>('/records', { params })
}

/**
 * Get single record by ID
 */
export function getRecord(recordId: string) {
  return http.get<PatientRecord>(`/records/${recordId}`)
}

/**
 * Update a record
 */
export function updateRecord(recordId: string, data: UpdateRecordPayload) {
  return http.put<PatientRecord>(`/records/${recordId}`, data)
}

/**
 * Delete a record (soft delete)
 */
export function deleteRecord(recordId: string) {
  return http.delete(`/records/${recordId}`)
}

/**
 * Restore a deleted record
 */
export function restoreRecord(recordId: string) {
  return http.post<PatientRecord>(`/records/${recordId}/restore`)
}
