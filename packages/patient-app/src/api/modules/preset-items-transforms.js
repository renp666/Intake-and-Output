const PRESET_ITEM_META = {
  intake: {
    饮水: { code: 'water', emoji: '💧' },
    汤类: { code: 'soup', emoji: '🍜' },
    牛奶: { code: 'milk', emoji: '🥛' },
    果汁: { code: 'juice', emoji: '🧃' },
    口服营养液: { code: 'nutrition', emoji: '🧴' },
    流质饮食: { code: 'liquid', emoji: '🥤' },
    半流质饮食: { code: 'semi_liquid', emoji: '🥣' },
    水果: { code: 'fruit', emoji: '🍎' },
    米饭: { code: 'rice', emoji: '🍚' },
    粉面: { code: 'noodles', emoji: '🍜' },
    包点: { code: 'steamed_buns', emoji: '🥟' },
    流质: { code: 'liquid', emoji: '🥤' },
    半流质: { code: 'semi_liquid', emoji: '🥣' },
  },
  output: {
    尿量: { code: 'urine', emoji: '💧' },
    大便: { code: 'stool', emoji: '💩' },
    呕吐物: { code: 'vomit', emoji: '🤢' },
  },
}

function createOtherItem(type) {
  return {
    code: type === 'intake' ? 'other_intake' : 'other_output',
    name: '其他',
    emoji: '📦',
    type,
    unit: 'ml',
    sortOrder: 999,
    isActive: true,
  }
}

export function buildPresetItemsParams(type) {
  return {
    type,
    permission: 'self',
  }
}

export function mapPresetItems(items = [], type) {
  const metaMap = PRESET_ITEM_META[type] || {}
  const mappedItems = items
    .map((item) => {
      const meta = metaMap[item.name]
      if (!meta) {
        return null
      }

      return {
        code: meta.code,
        name: item.name,
        emoji: meta.emoji,
        type,
        unit: item.unit || 'ml',
        sortOrder: item.sortOrder ?? 0,
        isActive: item.isActive !== false,
      }
    })
    .filter(Boolean)

  const hasOther = mappedItems.some((item) => item.code === createOtherItem(type).code)
  if (!hasOther) {
    mappedItems.push(createOtherItem(type))
  }

  return mappedItems.sort((a, b) => a.sortOrder - b.sortOrder)
}
