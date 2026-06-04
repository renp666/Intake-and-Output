import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDailyStatsParams,
  mapDailyStatsResponse,
} from '../statistics-transforms.js'

test('统计时间范围转换为后端查询参数', () => {
  assert.deepEqual(buildDailyStatsParams({ period: '24h' }), {
    type: 'rolling',
  })

  assert.deepEqual(buildDailyStatsParams({ period: 'today' }), {
    type: 'cumulative',
  })
})

test('将后端统计响应映射为统计页结构', () => {
  const stats = mapDailyStatsResponse({
    stats: {
      intake: 600,
      output: 300,
      balance: 300,
      items: {
        饮水: { intake: 400, output: 0, intakeCount: 2, outputCount: 0 },
        牛奶: { intake: 200, output: 0, intakeCount: 1, outputCount: 0 },
        尿量: { intake: 0, output: 300, intakeCount: 0, outputCount: 2 },
      },
    },
  })

  assert.deepEqual(stats, {
    intakeTotal: 600,
    outputTotal: 300,
    balance: 300,
    intakeBreakdown: [
      { projectCode: 'water', projectName: '饮水', total: 400, unit: 'ml', count: 2, percentage: 67 },
      { projectCode: 'milk', projectName: '牛奶', total: 200, unit: 'ml', count: 1, percentage: 33 },
    ],
    outputBreakdown: [
      { projectCode: 'urine', projectName: '尿量', total: 300, unit: 'ml', count: 2, percentage: 100 },
    ],
  })
})
