import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCreateBedPayload,
  buildUpdateBedPayload,
  mapBed,
} from '../bed-transforms.js'

test('将后端床位数据映射为页面展示结构', () => {
  const bed = mapBed({
    id: 'bed-1',
    bedNumber: 'A101',
    departmentId: 'dept-1',
    patientId: 'patient-1',
    patient: {
      id: 'patient-1',
      name: '张三',
      hospitalNumber: 'H001',
    },
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  })

  assert.deepEqual(bed, {
    id: 'bed-1',
    number: 'A101',
    departmentId: 'dept-1',
    status: 'occupied',
    patientId: 'patient-1',
    patientName: '张三',
    hospitalNumber: 'H001',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  })
})

test('新增床位表单转换为后端请求结构', () => {
  assert.deepEqual(
    buildCreateBedPayload({
      number: 'A101',
      departmentId: 'dept-1',
    }),
    {
      bedNumber: 'A101',
      departmentId: 'dept-1',
    }
  )
})

test('编辑床位表单转换为后端请求结构', () => {
  assert.deepEqual(
    buildUpdateBedPayload({
      number: 'B202',
      departmentId: 'dept-2',
    }),
    {
      bedNumber: 'B202',
      departmentId: 'dept-2',
    }
  )
})
