import test from 'node:test'
import assert from 'node:assert/strict'

import { buildMenuOptions } from '../menu-options.js'

test('普通菜单项点击时跳转到目标路由', () => {
  const pushed = []
  const options = buildMenuOptions({
    isAdmin: false,
    navigate: (path) => pushed.push(path),
  })

  const bedsOption = options.find((item) => item.key === '/beds')

  assert.ok(bedsOption)
  assert.equal(typeof bedsOption.props?.onClick, 'function')

  bedsOption.props.onClick()

  assert.deepEqual(pushed, ['/beds'])
})

test('管理员子菜单项点击时跳转到目标路由', () => {
  const pushed = []
  const options = buildMenuOptions({
    isAdmin: true,
    navigate: (path) => pushed.push(path),
  })

  const settingsOption = options.find((item) => item.key === '/settings')

  assert.ok(settingsOption)
  assert.ok(Array.isArray(settingsOption.children))

  const departmentsOption = settingsOption.children.find(
    (item) => item.key === '/settings/departments'
  )

  assert.ok(departmentsOption)
  assert.equal(typeof departmentsOption.props?.onClick, 'function')

  departmentsOption.props.onClick()

  assert.deepEqual(pushed, ['/settings/departments'])
})

test('提供标签渲染器时使用渲染后的导航标签', () => {
  const options = buildMenuOptions({
    isAdmin: false,
    navigate: () => {},
    renderLabel: (label, key) => `${label}:${key}`,
  })

  const bedsOption = options.find((item) => item.key === '/beds')

  assert.ok(bedsOption)
  assert.equal(bedsOption.label, '床位管理:/beds')
})
