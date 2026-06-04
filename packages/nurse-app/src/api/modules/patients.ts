import api from '../index'
import {
  buildCreatePatientPayload,
  buildDischargePayload,
  buildPatientListParams,
  buildUpdatePatientPayload,
  mapPatient
} from './patient-transforms.js'

export interface Patient {
  id: string
  hospitalNumber: string
  name: string
  gender: 'male' | 'female'
  age: number | null
  bedId: string | null
  bedNumber: string | null
  admissionDate: string
  dischargeDate: string | null
  status: 'admitted' | 'discharged'
  doctorName: string
  chargeNurse?: string
  diagnosis: string
  departmentId: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: 'admitted' | 'discharged' | 'all'
  bedId?: string
}

export interface PatientListResponse {
  items: Patient[]
  total: number
}

export const patientsApi = {
  list(params?: PatientListParams) {
    return api.get('/patients', { params: buildPatientListParams(params) }).then((res: any) => ({
      items: (res.data?.items || []).map(mapPatient),
      total: res.data?.total || 0
    }))
  },

  getById(id: string) {
    return api.get(`/patients/${id}`).then((res: any) => mapPatient(res.data))
  },

  getByHospitalNumber(hospitalNumber: string) {
    return api.get(`/patients/by-hospital-number/${hospitalNumber}`).then((res: any) => mapPatient(res.data))
  },

  create(data: Partial<Patient>) {
    return api.post('/patients', buildCreatePatientPayload({
      hospitalNumber: data.hospitalNumber || '',
      name: data.name || '',
      admissionDate: data.admissionDate,
      doctorName: data.doctorName,
      notes: data.notes || undefined
    })).then((res: any) => mapPatient(res.data))
  },

  update(id: string, data: Partial<Patient>) {
    return api.put(`/patients/${id}`, buildUpdatePatientPayload({
      hospitalNumber: data.hospitalNumber,
      name: data.name,
      admissionDate: data.admissionDate,
      doctorName: data.doctorName,
      notes: data.notes || undefined
    })).then((res: any) => mapPatient(res.data))
  },

  delete(id: string) {
    return api.delete(`/patients/${id}`)
  },

  discharge(id: string, data: { operatorName: string; dischargeDate?: string }) {
    return api.post(`/patients/${id}/discharge`, buildDischargePayload(data.operatorName))
  }
}
