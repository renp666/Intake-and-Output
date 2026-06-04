export function mapBed(rawBed) {
  return {
    id: rawBed.id,
    number: rawBed.bedNumber,
    departmentId: rawBed.departmentId,
    status: rawBed.patientId ? 'occupied' : 'free',
    patientId: rawBed.patientId ?? null,
    patientName: rawBed.patient?.name ?? null,
    hospitalNumber: rawBed.patient?.hospitalNumber ?? null,
    createdAt: rawBed.createdAt,
    updatedAt: rawBed.updatedAt,
  }
}

export function buildCreateBedPayload(formData) {
  return {
    bedNumber: formData.number,
    departmentId: formData.departmentId,
  }
}

export function buildUpdateBedPayload(formData) {
  const payload = {}

  if (formData.number) {
    payload.bedNumber = formData.number
  }

  if (formData.departmentId) {
    payload.departmentId = formData.departmentId
  }

  return payload
}
