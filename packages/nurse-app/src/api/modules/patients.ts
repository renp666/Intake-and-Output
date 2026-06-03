import api from '../index'

export interface Patient {
  id: number
  hospitalNumber: string
  name: string
  gender: 'male' | 'female'
  age: number
  bedId: number | null
  bedNumber: string | null
  admissionDate: string
  dischargeDate: string | null
  status: 'admitted' | 'discharged'
  doctorName: string
  diagnosis: string
  departmentId: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: 'admitted' | 'discharged' | 'all'
  bedId?: number
}

export interface PatientListResponse {
  items: Patient[]
  total: number
}

export const patientsApi = {
  list(params?: PatientListParams) {
    return api.get<any, PatientListResponse>('/patients', { params })
  },

  getById(id: number) {
    return api.get<any, Patient>(`/patients/${id}`)
  },

  getByHospitalNumber(hospitalNumber: string) {
    return api.get<any, Patient>(`/patients/hospital-number/${hospitalNumber}`)
  },

  create(data: Partial<Patient>) {
    return api.post<any, Patient>('/patients', data)
  },

  update(id: number, data: Partial<Patient>) {
    return api.put<any, Patient>(`/patients/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/patients/${id}`)
  },

  discharge(id: number, data: { operatorName: string; dischargeDate?: string }) {
    return api.post(`/patients/${id}/discharge`, data)
  }
}