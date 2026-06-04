# Patient Intake Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让患者端入量录入页支持米饭、粉面、包点和水果的 `g` 单位，并保证页面展示与保存记录使用真实单位。

**Architecture:** 保持现有患者端结构不变，只在预设项映射层和 `RecordIntakePage.vue` 内做小范围收口。先用回归测试锁定预设项映射，再修改录入页 fallback、动态单位展示和保存链路，最后跑测试与构建验证。

**Tech Stack:** Vue 3、TypeScript、Vant、Node.js `node:test`

---

## 文件结构

- 修改 `packages/patient-app/src/api/modules/preset-items-transforms.js`
  - 为 `米饭`、`粉面`、`包点` 增加 intake 映射元数据
- 修改 `packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`
  - 增加失败优先的回归测试，锁定新增食物项和水果单位
- 修改 `packages/patient-app/src/views/RecordIntakePage.vue`
  - 增加 `g` 单位 fallback 项
  - 新增当前所选项目单位的计算逻辑
  - 将单位展示和保存行为改为读取所选项目真实单位

### Task 1: 锁定预设项映射行为

**Files:**
- Modify: `packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`
- Modify: `packages/patient-app/src/api/modules/preset-items-transforms.js`
- Test: `packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`

- [ ] **Step 1: 写失败测试，覆盖新增食物项和水果单位**

```js
test('食物类入量项目能映射并保留 g 单位', () => {
  const items = mapPresetItems(
    [
      {
        id: 'preset-rice',
        name: '米饭',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 9,
      },
      {
        id: 'preset-noodles',
        name: '粉面',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 10,
      },
      {
        id: 'preset-buns',
        name: '包点',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 11,
      },
      {
        id: 'preset-fruit',
        name: '水果',
        type: 'intake',
        unit: 'g',
        isActive: true,
        sortOrder: 12,
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
```

- [ ] **Step 2: 运行单测，确认它因缺少映射而失败**

Run: `node --test packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`

Expected: FAIL，提示 `米饭`、`粉面`、`包点` 未映射，实际结果里缺少这些项目。

- [ ] **Step 3: 以最小改动补上映射元数据**

```js
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
}
```

- [ ] **Step 4: 重新运行单测，确认映射通过**

Run: `node --test packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`

Expected: PASS，新增测试与原有映射测试全部通过。

- [ ] **Step 5: 提交这一组最小改动**

```bash
git add packages/patient-app/src/api/modules/preset-items-transforms.js packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js
git commit -m "feat: support gram-based intake preset items"
```

### Task 2: 收口入量录入页的单位展示与保存链路

**Files:**
- Modify: `packages/patient-app/src/views/RecordIntakePage.vue`
- Test: `packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`

- [ ] **Step 1: 在录入页加入 `g` 单位 fallback 项**

```ts
const fallbackIntakeItems: PresetItem[] = [
  { code: 'water', name: '饮水', emoji: '💧', type: 'intake', unit: 'ml', sortOrder: 1, isActive: true },
  { code: 'soup', name: '汤类', emoji: '🍜', type: 'intake', unit: 'ml', sortOrder: 2, isActive: true },
  { code: 'milk', name: '牛奶', emoji: '🥛', type: 'intake', unit: 'ml', sortOrder: 3, isActive: true },
  { code: 'juice', name: '果汁', emoji: '🧃', type: 'intake', unit: 'ml', sortOrder: 4, isActive: true },
  { code: 'liquid', name: '流质', emoji: '🥤', type: 'intake', unit: 'ml', sortOrder: 5, isActive: true },
  { code: 'semi_liquid', name: '半流质', emoji: '🥣', type: 'intake', unit: 'ml', sortOrder: 6, isActive: true },
  { code: 'fruit', name: '水果', emoji: '🍎', type: 'intake', unit: 'g', sortOrder: 7, isActive: true },
  { code: 'rice', name: '米饭', emoji: '🍚', type: 'intake', unit: 'g', sortOrder: 8, isActive: true },
  { code: 'noodles', name: '粉面', emoji: '🍜', type: 'intake', unit: 'g', sortOrder: 9, isActive: true },
  { code: 'steamed_buns', name: '包点', emoji: '🥟', type: 'intake', unit: 'g', sortOrder: 10, isActive: true },
  { code: 'other_intake', name: '其他', emoji: '📦', type: 'intake', unit: 'ml', sortOrder: 999, isActive: true },
]
```

- [ ] **Step 2: 先让单位来源可计算，不再依赖固定 `ml`**

```ts
const currentUnit = computed(() => {
  const selectedItem = intakeItems.value.find((item) => item.code === selectedProject.value)
  return selectedItem?.unit || 'ml'
})

function selectProject(item: PresetItem) {
  selectedProject.value = item.code
  form.value.projectCode = item.code
  form.value.projectName = item.name
}
```

- [ ] **Step 3: 把模板里的固定文案和保存 unit 全部切到 `currentUnit`**

```vue
<div class="record-form__label">摄入量 ({{ currentUnit }})</div>

<template #button>
  <span class="amount-input__unit">{{ currentUnit }}</span>
</template>

<div class="amount-stepper__display">
  {{ form.amount || 0 }}
  <span class="amount-stepper__unit">{{ currentUnit }}</span>
</div>
```

```ts
const record = await recordsStore.addRecord({
  patientId: authStore.patientId,
  recordType: 'intake',
  projectName: form.value.projectName,
  projectCode: form.value.projectCode,
  amount: Number(form.value.amount),
  unit: currentUnit.value,
  recordTime: getRecordTime(),
  notes: form.value.notes || undefined,
  deviceId: getDeviceId(),
})
```

- [ ] **Step 4: 运行回归测试和构建检查**

Run: `node --test packages/patient-app/src/api/modules/__tests__/preset-items-transforms.test.js`

Expected: PASS

Run: `pnpm --filter patient-app build`

Expected: 构建成功，无 TypeScript 报错。

- [ ] **Step 5: 做手工验证并提交**

Manual check:

```text
1. 打开患者端记录入量页
2. 选择饮水，确认标题、输入框后缀、步进器显示 ml
3. 选择水果/米饭/粉面/包点，确认标题、输入框后缀、步进器显示 g
4. 提交一条水果或米饭记录，确认请求体 unit 为 g
```

```bash
git add packages/patient-app/src/views/RecordIntakePage.vue
git commit -m "fix: align intake record units with preset items"
```

## 自检

- 规格覆盖：映射层、fallback 默认项、动态单位展示、保存真实单位、测试与手工验证均有对应任务。
- 占位检查：计划中没有 `TODO`、`TBD` 或“类似上一步”的占位语句。
- 一致性检查：统一使用 `rice`、`noodles`、`steamed_buns` 作为新增项目 `code`，并统一使用 `currentUnit` 作为录入页单位来源。
