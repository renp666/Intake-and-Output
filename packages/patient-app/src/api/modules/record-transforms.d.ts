import type { PaginatedResponse, PatientRecord } from './patients'
import type { CreateRecordPayload, UpdateRecordPayload } from './records'

export function mapRecord(rawRecord: any): PatientRecord

export function buildCreateRecordPayload(
  payload: CreateRecordPayload
): Record<string, unknown>

export function buildUpdateRecordPayload(
  payload: UpdateRecordPayload
): Record<string, unknown>

export function buildRecordListResponse(
  payload: Partial<PaginatedResponse<any>> & {
    items?: any[]
    total?: number
    page?: number
    pageSize?: number
    totalPages?: number
  }
): PaginatedResponse<PatientRecord>
