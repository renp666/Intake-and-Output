import test from 'node:test'
import assert from 'node:assert/strict'
import { unwrapApiResponse } from '../response-helpers.js'

test('解包后端统一成功响应中的 data', () => {
  const payload = {
    code: 200,
    message: 'Success',
    data: {
      id: 'patient-1',
      name: '李四'
    }
  }

  assert.deepEqual(unwrapApiResponse(payload), {
    id: 'patient-1',
    name: '李四'
  })
})

test('非包装响应保持原样返回', () => {
  const payload = {
    id: 'patient-1',
    name: '李四'
  }

  assert.deepEqual(unwrapApiResponse(payload), payload)
})
