import { http } from '../index'
import {
  buildCreateRecordPayload,
  buildRecordListResponse,
  buildUpdateRecordPayload,
  mapRecord,
} from './record-transforms.js'

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
  return http.post('/records', buildCreateRecordPayload(data)).then((res: any) => mapRecord(res))
}

/**
 * Get records list with pagination
 */
export function getRecords(params?: RecordsQueryParams) {
  return http.get('/records', { params }).then((res: any) => buildRecordListResponse(res))
}

/**
 * Get single record by ID
 */
export function getRecord(recordId: string) {
  return http.get(`/records/${recordId}`).then((res: any) => mapRecord(res))
}

/**
 * Update a record
 */
export function updateRecord(recordId: string, data: UpdateRecordPayload) {
  return http.put(`/records/${recordId}`, buildUpdateRecordPayload(data)).then((res: any) => mapRecord(res))
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
  return http.post(`/records/${recordId}/restore`).then((res: any) => mapRecord(res))
}
