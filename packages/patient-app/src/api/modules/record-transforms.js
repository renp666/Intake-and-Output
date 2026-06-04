const PROJECT_CODE_BY_NAME = {
  '饮水': 'water',
  '汤类': 'soup',
  '牛奶': 'milk',
  '果汁': 'juice',
  '流质': 'liquid',
  '半流质': 'semi_liquid',
  '尿量': 'urine',
  '大便': 'stool',
  '呕吐物': 'vomit',
}

function resolveProjectCode(itemName, recordType) {
  if (PROJECT_CODE_BY_NAME[itemName]) {
    return PROJECT_CODE_BY_NAME[itemName]
  }

  return recordType === 'intake' ? 'other_intake' : 'other_output'
}

function resolveStatus(rawRecord) {
  if (rawRecord.isDeleted) {
    return 'deleted'
  }

  return rawRecord.confirmedAt ? 'confirmed' : 'pending'
}

export function mapRecord(rawRecord) {
  return {
    id: rawRecord.id,
    patientId: rawRecord.patientId,
    patientName: rawRecord.patient?.name,
    bedNumber: rawRecord.bedNumber,
    recordType: rawRecord.recordType,
    projectName: rawRecord.itemName,
    projectCode: resolveProjectCode(rawRecord.itemName, rawRecord.recordType),
    amount: rawRecord.amount,
    unit: rawRecord.unit,
    recordTime: rawRecord.recordTime,
    notes: rawRecord.notes ?? undefined,
    status: resolveStatus(rawRecord),
    createdAt: rawRecord.createdAt,
    updatedAt: rawRecord.updatedAt,
    createdBy: rawRecord.recorder?.name,
  }
}

export function buildCreateRecordPayload(payload) {
  return {
    patientId: payload.patientId,
    recordType: payload.recordType,
    itemName: payload.projectName,
    amount: payload.amount,
    unit: payload.unit,
    recordTime: payload.recordTime,
    notes: payload.notes,
    deviceFingerprint: payload.deviceId,
  }
}

export function buildUpdateRecordPayload(payload) {
  const nextPayload = {}

  if (payload.projectName) {
    nextPayload.itemName = payload.projectName
  }
  if (payload.amount !== undefined) {
    nextPayload.amount = payload.amount
  }
  if (payload.unit !== undefined) {
    nextPayload.unit = payload.unit
  }
  if (payload.recordTime !== undefined) {
    nextPayload.recordTime = payload.recordTime
  }
  if (payload.notes !== undefined) {
    nextPayload.notes = payload.notes
  }

  return nextPayload
}

export function buildRecordListResponse(payload) {
  const pageSize = payload.pageSize || 20
  const total = payload.total || 0

  return {
    items: (payload.items || []).map(mapRecord),
    total,
    page: payload.page || 1,
    pageSize,
    totalPages: payload.totalPages || Math.ceil(total / pageSize),
  }
}
