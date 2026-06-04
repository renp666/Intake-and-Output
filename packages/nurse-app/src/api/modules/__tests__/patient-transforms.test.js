import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCreatePatientPayload,
  buildDischargePayload,
  buildPatientListParams,
  mapPatient,
} from '../patient-transforms.js'

test('将后端病人数据映射为页面展示结构', () => {
  const patient = mapPatient({
    id: 'patient-1',
    hospitalNumber: 'H001',
    name: '张三',
    bedNumber: 'A101',
    admissionDate: '2026-06-04T00:00:00.000Z',
    dischargeDate: null,
    status: 'active',
    attendingDoctor: '王医生',
    chargeNurse: '李护士',
    notes: '备注信息',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  })

  assert.deepEqual(patient, {
    id: 'patient-1',
    hospitalNumber: 'H001',
    name: '张三',
    gender: 'male',
    age: null,
    bedId: null,
    bedNumber: 'A101',
    admissionDate: '2026-06-04T00:00:00.000Z',
    dischargeDate: null,
    status: 'admitted',
    doctorName: '王医生',
    chargeNurse: '李护士',
    diagnosis: '',
    departmentId: '',
    notes: '备注信息',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
  })
})

test('病人列表查询参数转换为后端结构', () => {
  assert.deepEqual(
    buildPatientListParams({
      page: 2,
      pageSize: 20,
      keyword: '张三',
      status: 'admitted',
    }),
    {
      page: 2,
      pageSize: 20,
      search: '张三',
      status: 'active',
    }
  )
})

test('病人新增表单转换为后端请求结构', () => {
  assert.deepEqual(
    buildCreatePatientPayload({
      hospitalNumber: 'H001',
      name: '张三',
      admissionDate: '2026-06-04T00:00:00.000Z',
      doctorName: '王医生',
      notes: '备注信息',
    }),
    {
      hospitalNumber: 'H001',
      name: '张三',
      admissionDate: '2026-06-04T00:00:00.000Z',
      attendingDoctor: '王医生',
      notes: '备注信息',
    }
  )
})

test('出院请求字段转换为后端结构', () => {
  assert.deepEqual(buildDischargePayload('护士甲'), { operator_name: '护士甲' })
})
