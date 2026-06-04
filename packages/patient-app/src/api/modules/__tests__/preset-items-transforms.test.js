import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPresetItemsParams,
  mapPresetItems,
} from '../preset-items-transforms.js'

test('患者端预设项目查询参数转换为后端结构', () => {
  assert.deepEqual(buildPresetItemsParams('intake'), {
    type: 'intake',
    permission: 'self',
  })
})

test('将后端预设项目映射为录入页可用结构并补其他项', () => {
  const items = mapPresetItems(
    [
      {
        id: 'preset-water',
        name: '饮水',
        type: 'intake',
        unit: 'ml',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'preset-liquid',
        name: '流质饮食',
        type: 'intake',
        unit: 'ml',
        isActive: true,
        sortOrder: 2,
      },
    ],
    'intake'
  )

  assert.deepEqual(items, [
    { code: 'water', name: '饮水', emoji: '💧', type: 'intake', unit: 'ml', sortOrder: 1, isActive: true },
    { code: 'liquid', name: '流质饮食', emoji: '🥤', type: 'intake', unit: 'ml', sortOrder: 2, isActive: true },
    { code: 'other_intake', name: '其他', emoji: '📦', type: 'intake', unit: 'ml', sortOrder: 999, isActive: true },
  ])
})

test('患者自助入量种子项目都能映射到录入页', () => {
  const items = mapPresetItems(
    [
      {
        id: 'preset-water',
        name: '饮水',
        type: 'intake',
        unit: 'ml',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'preset-nutrition',
        name: '口服营养液',
        type: 'intake',
        unit: 'ml',
        isActive: true,
        sortOrder: 5,
      },
      {
        id: 'preset-fruit',
        name: '水果',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 8,
      },
    ],
    'intake'
  )

  assert.deepEqual(
    items.map((item) => ({ code: item.code, name: item.name, emoji: item.emoji, unit: item.unit })),
    [
      { code: 'water', name: '饮水', emoji: '💧', unit: 'ml' },
      { code: 'nutrition', name: '口服营养液', emoji: '🧴', unit: 'ml' },
      { code: 'fruit', name: '水果', emoji: '🍎', unit: 'g' },
      { code: 'other_intake', name: '其他', emoji: '📦', unit: 'ml' },
    ]
  )
})

test('患者自助入量种子项目支持米饭粉面包点映射', () => {
  const items = mapPresetItems(
    [
      {
        id: 'preset-rice',
        name: '米饭',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 8,
      },
      {
        id: 'preset-noodles',
        name: '粉面',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 9,
      },
      {
        id: 'preset-steamed-buns',
        name: '包点',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 10,
      },
      {
        id: 'preset-fruit',
        name: '水果',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 11,
      },
    ],
    'intake'
  )

  assert.deepEqual(
    items.map((item) => ({ code: item.code, name: item.name, unit: item.unit })),
    [
      { code: 'rice', name: '米饭', unit: 'g' },
      { code: 'noodles', name: '粉面', unit: 'g' },
      { code: 'steamed_buns', name: '包点', unit: 'g' },
      { code: 'fruit', name: '水果', unit: 'g' },
      { code: 'other_intake', name: '其他', unit: 'ml' },
    ]
  )
})
