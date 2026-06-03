<template>
  <div class="page-container page-container--no-tabbar">
    <!-- Navigation Bar -->
    <van-nav-bar
      title="编辑记录"
      left-text="返回"
      left-arrow
      @click-left="goBack"
      :border="true"
    />

    <!-- Loading -->
    <van-loading v-if="loading" size="48px" vertical class="edit-loading">加载中...</van-loading>

    <template v-else-if="record">
      <div class="record-form">
        <!-- Record Type Display -->
        <div class="record-type-display">
          <div :class="['record-type-display__badge', `record-type-display__badge--${record.recordType}`]">
            {{ record.recordType === 'intake' ? '入量' : '出量' }}
          </div>
          <span class="record-type-display__name">{{ record.projectName }}</span>
        </div>

        <!-- Amount Input -->
        <div class="record-form__section">
          <div class="record-form__label">
            {{ record.recordType === 'intake' ? '摄入量 (ml)' : '排出量 (ml)' }}
          </div>
          <van-field
            v-model="form.amount"
            type="number"
            :placeholder="record.recordType === 'intake' ? '请输入摄入量' : '请输入排出量'"
            input-align="center"
            :border="false"
            class="amount-input"
          >
            <template #button>
              <span class="amount-input__unit">ml</span>
            </template>
          </van-field>

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
            保存修改
          </van-button>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else class="empty-state">
      <div class="empty-state__icon">❌</div>
      <div class="empty-state__text">记录不存在或已被删除</div>
      <van-button type="primary" size="small" @click="goBack">返回</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useRecordsStore } from '@/stores/records'
import { getRecord } from '@/api/modules/records'
import { formatTime } from '@/utils/format'
import type { PatientRecord } from '@/api/modules/patients'

const route = useRoute()
const router = useRouter()
const recordsStore = useRecordsStore()

const recordId = route.params.id as string

const loading = ref(true)
const saving = ref(false)
const record = ref<PatientRecord | null>(null)
const showTimePicker = ref(false)
const currentTime = ref<string[]>([])
const displayTime = ref('')

const form = ref({
  amount: '',
  notes: '',
})

// Computed
const canSave = computed(() => {
  return form.value.amount && Number(form.value.amount) > 0
})

onMounted(() => {
  fetchRecord()
})

async function fetchRecord() {
  loading.value = true
  try {
    // Try to find in store first
    const found = recordsStore.records.find((r) => r.id === recordId)
    if (found) {
      record.value = found
    } else {
      // Fetch from API
      const data = await getRecord(recordId)
      record.value = data
    }

    // Populate form
    if (record.value) {
      form.value.amount = String(record.value.amount)
      form.value.notes = record.value.notes || ''

      const date = new Date(record.value.recordTime)
      currentTime.value = [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
      ]
      displayTime.value = formatTime(record.value.recordTime)
    }
  } catch (error) {
    console.error('Failed to fetch record:', error)
    record.value = null
  } finally {
    loading.value = false
  }
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
  const now = record.value ? new Date(record.value.recordTime) : new Date()
  const [hours, minutes] = currentTime.value
  now.setHours(Number(hours), Number(minutes), 0, 0)
  return now.toISOString()
}

async function handleSave() {
  if (!canSave.value || !record.value) return

  saving.value = true
  try {
    const updated = await recordsStore.editRecord(record.value.id, {
      amount: Number(form.value.amount),
      recordTime: getRecordTime(),
      notes: form.value.notes || undefined,
    })

    if (updated) {
      showToast('修改保存成功')
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
.edit-loading {
  padding: 60px 0;
}

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

.record-type-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F9FA;
  border-radius: 12px;
  margin-bottom: 24px;

  &__badge {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #FFFFFF;

    &--intake {
      background: #52C41A;
    }

    &--output {
      background: #FA8C16;
    }
  }

  &__name {
    font-size: 18px;
    font-weight: 600;
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
  }

  &__unit {
    font-size: 16px;
    color: #999;
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
    color: #1890FF;
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
  }
}
</style>
