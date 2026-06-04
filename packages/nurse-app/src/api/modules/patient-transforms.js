export function mapPatient(rawPatient) {
  return {
    id: rawPatient.id,
    hospitalNumber: rawPatient.hospitalNumber,
    name: rawPatient.name,
    gender: 'male',
    age: null,
    bedId: null,
    bedNumber: rawPatient.bedNumber ?? null,
    admissionDate: rawPatient.admissionDate,
    dischargeDate: rawPatient.dischargeDate ?? null,
    status: rawPatient.status === 'discharged' ? 'discharged' : 'admitted',
    doctorName: rawPatient.attendingDoctor ?? '',
    chargeNurse: rawPatient.chargeNurse ?? '',
    diagnosis: '',
    departmentId: '',
    notes: rawPatient.notes ?? '',
    createdAt: rawPatient.createdAt,
    updatedAt: rawPatient.updatedAt,
  }
}

export function buildPatientListParams(params = {}) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.keyword,
    status: params.status === 'admitted' ? 'active' : params.status,
  }
}

export function buildCreatePatientPayload(formData) {
  return {
    hospitalNumber: formData.hospitalNumber,
    name: formData.name,
    admissionDate: formData.admissionDate,
    attendingDoctor: formData.doctorName,
    notes: formData.notes,
  }
}

export function buildUpdatePatientPayload(formData) {
  const payload = {
    hospitalNumber: formData.hospitalNumber,
    name: formData.name,
    admissionDate: formData.admissionDate,
    attendingDoctor: formData.doctorName,
    notes: formData.notes,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )
}

export function buildDischargePayload(operatorName) {
  return {
    operator_name: operatorName,
  }
}
