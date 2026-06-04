export interface RawBed {
  id: string
  bedNumber: string
  departmentId: string
  patientId?: string | null
  patient?: {
    name?: string | null
    hospitalNumber?: string | null
  } | null
  createdAt: string
  updatedAt: string
}

export interface BedFormData {
  number: string
  departmentId: string
}

export function mapBed(rawBed: RawBed): {
  id: string
  number: string
  departmentId: string
  status: 'free' | 'occupied'
  patientId: string | null
  patientName: string | null
  hospitalNumber: string | null
  createdAt: string
  updatedAt: string
}

export function buildCreateBedPayload(formData: BedFormData): {
  bedNumber: string
  departmentId: string
}

export function buildUpdateBedPayload(formData: Partial<BedFormData>): Partial<{
  bedNumber: string
  departmentId: string
}>
