import type { PatientListParams } from './patients'

export interface RawPatient {
  id: string
  hospitalNumber: string
  name: string
  bedNumber?: string | null
  admissionDate: string
  dischargeDate?: string | null
  status: string
  attendingDoctor?: string | null
  chargeNurse?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientFormData {
  hospitalNumber: string
  name: string
  admissionDate?: string
  doctorName?: string
  notes?: string
}

export function mapPatient(rawPatient: RawPatient): any
export function buildPatientListParams(params?: PatientListParams): Record<string, unknown>
export function buildCreatePatientPayload(formData: PatientFormData): Record<string, unknown>
export function buildUpdatePatientPayload(formData: Partial<PatientFormData>): Record<string, unknown>
export function buildDischargePayload(operatorName: string): { operator_name: string }
