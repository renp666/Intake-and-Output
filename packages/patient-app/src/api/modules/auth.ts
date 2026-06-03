import { http } from '../index'

export interface PatientInfo {
  id: string
  name: string
  hospitalNumber: string
  bedNumber: string
  wardId?: string
  wardName?: string
  admissionDate?: string
  diagnosis?: string
}

export interface VerifyResponse {
  patient: PatientInfo
  token: string
}

/**
 * Verify patient identity by bed number
 */
export function verifyIdentity(bedNumber: string) {
  return http.post<PatientInfo>('/patients/verify', { bedNumber })
}

/**
 * Get patient info by bed number
 */
export function getPatientByBed(bedNumber: string) {
  return http.get<PatientInfo>(`/patients/bed/${bedNumber}`)
}
