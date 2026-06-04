<template>
  <div class="page-container page-container--no-tabbar">
    <!-- Navigation Bar -->
    <van-nav-bar
      title="记录入量"
      left-text="返回"
      left-arrow
      @click-left="goBack"
      :border="true"
    />

    <div class="record-form">
      <!-- Project Selection Grid -->
      <div class="record-form__section">
        <div class="record-form__label">选择项目</div>
        <div class="intake-grid">
          <div
            v-for="item in intakeItems"
            :key="item.code"
            :class="['intake-grid__item', { 'intake-grid__item--active': selectedProject === item.code }]"
            @click="selectProject(item)"
          >
            <div class="intake-grid__emoji">{{ item.emoji }}</div>
            <div class="intake-grid__name">{{ item.name }}</div>
          </div>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="record-form__section">
        <div class="record-form__label">摄入量 ({{ currentUnit }})</div>
        <van-field
          v-model="form.amount"
          type="number"
          placeholder="请输入摄入量"
          input-align="center"
          :border="false"
          class="amount-input"
        >
          <template #button>
            <span class="amount-input__unit">{{ currentUnit }}</span>
          </template>
        </van-field>

        <!-- Quick Amount Buttons -->
        <div class="quick-amounts">
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
            {{ form.amount || 0 }}
            <span class="amount-stepper__unit">{{ currentUnit }}</span>
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
import { ref, computed, onMounted } from 'vue'
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

// Intake items
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
const intakeItems = ref<PresetItem[]>([...fallbackIntakeItems])

const quickAmounts = [100, 200, 250, 500]

// Form state
const form = ref({
  projectCode: '',
  projectName: '',
  amount: '',
  notes: '',
})

const selectedProject = ref('')
const showTimePicker = ref(false)
const currentTime = ref<string[]>([])
const displayTime = ref(getCurrentTime())
const saving = ref(false)

// Computed
const currentUnit = computed(() => {
  const selectedItem = intakeItems.value.find(item => item.code === selectedProject.value)
  return selectedItem?.unit || 'ml'
})

const canSave = computed(() => {
  return selectedProject.value && form.value.amount && Number(form.value.amount) > 0
})

onMounted(() => {
  // Set default time to now
  const now = new Date()
  currentTime.value = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ]
  loadPresetItems()
})

async function loadPresetItems() {
  try {
    const items = await getPresetItems('intake')
    if (items?.length) {
      intakeItems.value = items
    }
  } catch (error) {
    console.error('Failed to load intake preset items:', error)
  }
}

function selectProject(item: { code: string; name: string; emoji: string }) {
  selectedProject.value = item.code
  form.value.projectCode = item.code
  form.value.projectName = item.name
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

  saving.value = true
  try {
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

.intake-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  &__item {
    background: #F0FFF0;
    border: 2px solid #E8E8E8;
    border-radius: 12px;
    padding: 16px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.98);
    }

    &--active {
      background: #52C41A;
      border-color: #52C41A;
      color: #FFFFFF;

      .intake-grid__name {
        color: #FFFFFF;
      }
    }
  }

  &__emoji {
    font-size: 28px;
    margin-bottom: 8px;
  }

  &__name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
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
    color: #52C41A;
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
    color: #52C41A;
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
    background: #52C41A;
    border-color: #52C41A;
  }
}
</style>
