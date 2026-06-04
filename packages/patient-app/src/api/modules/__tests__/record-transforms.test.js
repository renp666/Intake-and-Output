import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCreateRecordPayload,
  buildRecordListResponse,
  buildUpdateRecordPayload,
  mapRecord,
} from '../record-transforms.js'

test('将后端记录映射为患者端展示结构', () => {
  const record = mapRecord({
    id: 'record-1',
    patientId: 'patient-1',
    bedNumber: 'A001',
    recordType: 'intake',
    itemName: '饮水',
    amount: 200,
    unit: 'ml',
    recordTime: '2026-06-04T10:00:00.000Z',
    notes: '饭后',
    confirmedAt: null,
    isDeleted: false,
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
    patient: {
      name: '李四',
    },
  })

  assert.deepEqual(record, {
    id: 'record-1',
    patientId: 'patient-1',
    patientName: '李四',
    bedNumber: 'A001',
    recordType: 'intake',
    projectName: '饮水',
    projectCode: 'water',
    amount: 200,
    unit: 'ml',
    recordTime: '2026-06-04T10:00:00.000Z',
    notes: '饭后',
    status: 'pending',
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-04T10:00:00.000Z',
    createdBy: undefined,
  })
})

test('创建记录请求转换为后端字段', () => {
  assert.deepEqual(
    buildCreateRecordPayload({
      patientId: 'patient-1',
      recordType: 'output',
      projectName: '尿量',
      projectCode: 'urine',
      amount: 300,
      unit: 'ml',
      recordTime: '2026-06-04T10:00:00.000Z',
      notes: '测试',
      deviceId: 'device-1',
    }),
    {
      patientId: 'patient-1',
      recordType: 'output',
      itemName: '尿量',
      amount: 300,
      unit: 'ml',
      recordTime: '2026-06-04T10:00:00.000Z',
      notes: '测试',
      deviceFingerprint: 'device-1',
    }
  )
})

test('更新记录请求只输出后端支持字段', () => {
  assert.deepEqual(
    buildUpdateRecordPayload({
      projectName: '饮水',
      amount: 260,
      recordTime: '2026-06-04T10:30:00.000Z',
      notes: '更新后',
    }),
    {
      itemName: '饮水',
      amount: 260,
      recordTime: '2026-06-04T10:30:00.000Z',
      notes: '更新后',
    }
  )
})

test('列表响应补齐 totalPages 并映射记录字段', () => {
  const response = buildRecordListResponse({
    items: [
      {
        id: 'record-1',
        patientId: 'patient-1',
        bedNumber: 'A001',
        recordType: 'output',
        itemName: '尿量',
        amount: 300,
        unit: 'ml',
        recordTime: '2026-06-04T10:00:00.000Z',
        confirmedAt: '2026-06-04T10:10:00.000Z',
        isDeleted: false,
        createdAt: '2026-06-04T10:00:00.000Z',
        updatedAt: '2026-06-04T10:10:00.000Z',
      },
    ],
    total: 21,
    page: 1,
    pageSize: 20,
  })

  assert.equal(response.totalPages, 2)
  assert.equal(response.items[0].projectCode, 'urine')
  assert.equal(response.items[0].status, 'confirmed')
})
