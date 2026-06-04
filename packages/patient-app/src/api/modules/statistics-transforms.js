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

function getProjectCode(name, type) {
  if (PROJECT_CODE_BY_NAME[name]) {
    return PROJECT_CODE_BY_NAME[name]
  }

  return type === 'intake' ? 'other_intake' : 'other_output'
}

function toBreakdown(items = {}, type, totalAmount) {
  const list = Object.entries(items)
    .map(([projectName, stats]) => {
      const total = type === 'intake' ? stats.intake || 0 : stats.output || 0
      const count = type === 'intake' ? stats.intakeCount || 0 : stats.outputCount || 0
      if (total <= 0) {
        return null
      }

      return {
        projectCode: getProjectCode(projectName, type),
        projectName,
        total,
        unit: 'ml',
        count,
        percentage: totalAmount > 0 ? Math.round((total / totalAmount) * 100) : 0,
      }
    })
    .filter(Boolean)

  return list.sort((a, b) => b.total - a.total)
}

export function buildDailyStatsParams(params = {}) {
  if (params.period === 'today') {
    return { type: 'cumulative' }
  }

  return { type: 'rolling' }
}

export function mapDailyStatsResponse(payload) {
  const stats = payload?.stats || {}
  const intakeTotal = stats.intake || 0
  const outputTotal = stats.output || 0
  const items = stats.items || {}

  return {
    intakeTotal,
    outputTotal,
    balance: stats.balance || 0,
    intakeBreakdown: toBreakdown(items, 'intake', intakeTotal),
    outputBreakdown: toBreakdown(items, 'output', outputTotal),
  }
}
