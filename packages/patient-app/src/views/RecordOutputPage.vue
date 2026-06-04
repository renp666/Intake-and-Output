<template>
  <div class="page-container page-container--no-tabbar">
    <!-- Navigation Bar -->
    <van-nav-bar
      title="记录出量"
      left-text="返回"
      left-arrow
      @click-left="goBack"
      :border="true"
    />

    <div class="record-form">
      <!-- Project Selection Grid -->
      <div class="record-form__section">
        <div class="record-form__label">选择项目</div>
        <div class="output-grid">
          <div
            v-for="item in outputItems"
            :key="item.code"
            :class="['output-grid__item', { 'output-grid__item--active': selectedProject === item.code }]"
            @click="selectProject(item)"
          >
            <div class="output-grid__emoji">{{ item.emoji }}</div>
            <div class="output-grid__name">{{ item.name }}</div>
          </div>
        </div>
      </div>

      <!-- Bristol Stool Scale (only for stool) -->
      <div v-if="selectedProject === 'stool'" class="record-form__section">
        <div class="record-form__label">Bristol大便分型</div>
        <div class="bristol-scale">
          <div
            v-for="type in bristolTypes"
            :key="type.type"
            :class="['bristol-scale__item', `bristol-scale__item--${type.category}`, { 'bristol-scale__item--active': form.bristolType === type.type }]"
            @click="selectBristol(type)"
          >
            <div class="bristol-scale__type">{{ romanNumerals[type.type - 1] }}</div>
            <div class="bristol-scale__desc">{{ type.name }}</div>
          </div>
        </div>

        <!-- Bristol Info -->
        <div v-if="form.bristolType" class="bristol-info">
          <template v-if="form.bristolType <= 4">
            <div class="bristol-notice">
              成形便不计入出量
            </div>
          </template>
          <template v-else>
            <div class="bristol-weight">
              <div class="record-form__label">大便重量 (g)</div>
              <van-field
                v-model="form.stoolWeight"
                type="number"
                placeholder="请输入重量"
                input-align="center"
              >
                <template #button>
                  <span>g</span>
                </template>
              </van-field>
              <div v-if="convertedMl > 0" class="bristol-conversion">
                换算体积：<span class="bristol-conversion__value">{{ convertedMl }}ml</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Amount Input (for non-stool or stool V-VII) -->
      <div v-if="shouldShowAmount" class="record-form__section">
        <div class="record-form__label">
          {{ selectedProject === 'stool' ? '换算后体积 (ml)' : '排出量 (ml)' }}
        </div>
        <van-field
          v-model="form.amount"
          type="number"
          :placeholder="selectedProject === 'stool' ? '自动计算或手动输入' : '请输入排出量'"
          input-align="center"
          :border="false"
          class="amount-input"
          :readonly="selectedProject === 'stool' && form.bristolType > 4"
        >
          <template #button>
            <span class="amount-input__unit">ml</span>
          </template>
        </van-field>

        <!-- Quick Amount Buttons -->
        <div v-if="selectedProject !== 'stool'" class="quick-amounts">
          <van-button
            v-for="val in quickAmounts"
            :key="val"
            size="small"
            :type="form.amount === String(val) ? 'primary' : 'default'"
            @click="setAmount(val)"
          >
            {{ val }}
          </van-button>
        </div>

        <!-- Stepper -->
        <div class="amount-stepper">
          <van-button
            size="large"
            icon="minus"
            :disabled="!form.amount || Number(form.amount) <= 0"
            @click="adjustAmount(-50)"
          />
          <div class="amount-stepper__display">
            {{ displayAmount }}
            <span class="amount-stepper__unit">ml</span>
          </div>
          <van-button size="large" icon="plus" @click="adjustAmount(50)" />
        </div>
      </div>

      <!-- Time Picker -->
      <div class="record-form__section">
        <div class="record-form__label">记录时间</div>
        <van-field
          v-model="displayTime"
          is-link
          readonly
          placeholder="选择时间"
          @click="showTimePicker = true"
        />
        <van-popup v-model:show="showTimePicker" position="bottom" round>
          <van-time-picker
            v-model="currentTime"
            title="选择时间"
            :columns-type="['hour', 'minute']"
            @confirm="onTimeConfirm"
            @cancel="showTimePicker = false"
          />
        </van-popup>
      </div>

      <!-- Notes -->
      <div class="record-form__section">
        <div class="record-form__label">备注（可选）</div>
        <van-field
          v-model="form.notes"
          type="textarea"
          placeholder="添加备注信息..."
          :maxlength="200"
          show-word-limit
          :rows="2"
          :autosize="true"
        />
      </div>

      <!-- Save Button -->
      <div class="record-form__actions">
        <van-button
          type="primary"
          block
          size="large"
          :loading="saving"
          loading-text="保存中..."
          :disabled="!canSave"
          @click="handleSave"
        >
          保存记录
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useRecordsStore } from '@/stores/records'
import { getCurrentTime } from '@/utils/format'
import { getDeviceId } from '@/utils/device'
import { getPresetItems, type PresetItem } from '@/api/modules/config'

const router = useRouter()
const authStore = useAuthStore()
const recordsStore = useRecordsStore()

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Output items
const fallbackOutputItems: PresetItem[] = [
  { code: 'urine', name: '尿量', emoji: '💧', type: 'output', unit: 'ml', sortOrder: 1, isActive: true },
  { code: 'stool', name: '大便', emoji: '💩', type: 'output', unit: 'ml', sortOrder: 2, isActive: true },
  { code: 'vomit', name: '呕吐物', emoji: '🤢', type: 'output', unit: 'ml', sortOrder: 3, isActive: true },
  { code: 'other_output', name: '其他', emoji: '📦', type: 'output', unit: 'ml', sortOrder: 999, isActive: true },
]
const outputItems = ref<PresetItem[]>([...fallbackOutputItems])

// Bristol stool scale types
const bristolTypes = [
  { type: 1, name: '坚果状', category: 'formed' },
  { type: 2, name: '表面坑洼腊肠状', category: 'formed' },
  { type: 3, name: '表面有裂纹', category: 'formed' },
  { type: 4, name: '光滑软便', category: 'formed' },
  { type: 5, name: '软团块', category: 'loose' },
  { type: 6, name: '糊状便', category: 'loose' },
  { type: 7, name: '水样便', category: 'loose' },
]

// Bristol type conversion factors (g -> ml)
const bristolFactors: Record<number, number> = {
  5: 0.60,
  6: 0.80,
  7: 0.95,
}

const quickAmounts = [100, 200, 300, 500]

// Form state
const form = ref({
  projectCode: '',
  projectName: '',
  amount: '',
  notes: '',
  bristolType: 0,
  stoolWeight: '',
})

const selectedProject = ref('')
const showTimePicker = ref(false)
const currentTime = ref<string[]>([])
const displayTime = ref(getCurrentTime())
const saving = ref(false)

// Computed
const convertedMl = computed(() => {
  if (form.value.bristolType > 4 && form.value.stoolWeight) {
    const weight = Number(form.value.stoolWeight)
    const factor = bristolFactors[form.value.bristolType] || 0.8
    return Math.round(weight * factor)
  }
  return 0
})

const displayAmount = computed(() => {
  if (selectedProject.value === 'stool' && form.value.bristolType > 4) {
    return convertedMl.value || 0
  }
  return form.value.amount || 0
})

const shouldShowAmount = computed(() => {
  if (selectedProject.value !== 'stool') return true
  if (form.value.bristolType > 4) return true
  return false
})

const canSave = computed(() => {
  if (!selectedProject.value) return false

  if (selectedProject.value === 'stool') {
    if (!form.value.bristolType) return false
    if (form.value.bristolType <= 4) return true // 成形便不计量
    return form.value.stoolWeight && Number(form.value.stoolWeight) > 0
  }

  return form.value.amount && Number(form.value.amount) > 0
})

// Watch stool weight changes to auto-update amount
watch(
  () => convertedMl.value,
  (val) => {
    if (val > 0) {
      form.value.amount = String(val)
    }
  }
)

onMounted(() => {
  const now = new Date()
  currentTime.value = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ]
  loadPresetItems()
})

async function loadPresetItems() {
  try {
    const items = await getPresetItems('output')
    if (items?.length) {
      outputItems.value = items
    }
  } catch (error) {
    console.error('Failed to load output preset items:', error)
  }
}

function selectProject(item: { code: string; name: string; emoji: string }) {
  selectedProject.value = item.code
  form.value.projectCode = item.code
  form.value.projectName = item.name
  // Reset bristol when changing project
  if (item.code !== 'stool') {
    form.value.bristolType = 0
    form.value.stoolWeight = ''
  }
}

function selectBristol(type: { type: number; name: string }) {
  form.value.bristolType = type.type
  if (type.type <= 4) {
    form.value.amount = '0'
  }
}

function setAmount(val: number) {
  form.value.amount = String(val)
}

function adjustAmount(delta: number) {
  const current = Number(form.value.amount) || 0
  const newVal = Math.max(0, current + delta)
  form.value.amount = String(newVal)
}

function onTimeConfirm({ selectedValues }: { selectedValues: string[] }) {
  currentTime.value = selectedValues
  displayTime.value = `${selectedValues[0]}:${selectedValues[1]}`
  showTimePicker.value = false
}

function getRecordTime(): string {
  const now = new Date()
  const [hours, minutes] = currentTime.value
  now.setHours(Number(hours), Number(minutes), 0, 0)
  return now.toISOString()
}

async function handleSave() {
  if (!canSave.value) return

  const amount = selectedProject.value === 'stool' && form.value.bristolType <= 4
    ? 0
    : Number(form.value.amount)

  saving.value = true
  try {
    const record = await recordsStore.addRecord({
      patientId: authStore.patientId,
      recordType: 'output',
      projectName: form.value.projectName,
      projectCode: form.value.projectCode,
      amount,
      unit: 'ml',
      recordTime: getRecordTime(),
      notes: form.value.notes || undefined,
      bristolType: form.value.bristolType || undefined,
      deviceId: getDeviceId(),
    })

    if (record) {
      showToast('记录保存成功')
      router.back()
    }
  } catch (error) {
    console.error('Save failed:', error)
    showToast('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<style lang="less" scoped>
.record-form {
  padding: 16px;

  &__section {
    margin-bottom: 24px;
  }

  &__label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 12px;
  }
}

.output-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  &__item {
    background: #FFF7E6;
    border: 2px solid #E8E8E8;
    border-radius: 12px;
    padding: 20px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.98);
    }

    &--active {
      background: #FA8C16;
      border-color: #FA8C16;
      color: #FFFFFF;

      .output-grid__name {
        color: #FFFFFF;
      }
    }
  }

  &__emoji {
    font-size: 32px;
    margin-bottom: 8px;
  }

  &__name {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }
}

.bristol-scale {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  &__item {
    flex: 1;
    min-width: calc(25% - 8px);
    background: #F5F5F5;
    border: 2px solid #E8E8E8;
    border-radius: 8px;
    padding: 12px 4px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;

    &--formed {
      background: #F5F5F5;
    }

    &--loose {
      background: #FFF7E6;
    }

    &--active {
      border-color: #FA8C16;
      background: #FA8C16;
      color: #FFFFFF;

      .bristol-scale__type,
      .bristol-scale__desc {
        color: #FFFFFF;
      }
    }
  }

  &__type {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }

  &__desc {
    font-size: 10px;
    color: #666;
    line-height: 1.2;
  }
}

.bristol-info {
  margin-top: 16px;
}

.bristol-notice {
  background: #F5F5F5;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px 16px;
}

.bristol-weight {
  background: #FFF7E6;
  border-radius: 12px;
  padding: 16px;
}

.bristol-conversion {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #666;

  &__value {
    font-size: 20px;
    font-weight: 700;
    color: #FA8C16;
  }
}

.amount-input {
  background: #FFFFFF;
  border-radius: 12px;
  margin-bottom: 12px;

  :deep(.van-field__control) {
    font-size: 32px;
    font-weight: 700;
    text-align: center;
    color: #FA8C16;
  }

  &__unit {
    font-size: 16px;
    color: #999;
  }
}

.quick-amounts {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  .van-button {
    flex: 1;
  }
}

.amount-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 16px 0;

  .van-button {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  &__display {
    font-size: 36px;
    font-weight: 700;
    color: #FA8C16;
    min-width: 120px;
    text-align: center;
  }

  &__unit {
    font-size: 16px;
    font-weight: 400;
    color: #999;
  }
}

.record-form__actions {
  margin-top: 32px;
  padding-bottom: 24px;

  .van-button {
    height: 52px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    background: #FA8C16;
    border-color: #FA8C16;
  }
}
</style>
