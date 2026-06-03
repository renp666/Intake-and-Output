<template>
  <n-modal
    :show="visible"
    @update:show="(val: boolean) => emit('update:visible', val)"
    :title="title"
    style="width: 400px"
    :mask-closable="false"
  >
    <n-form label-placement="left" label-width="80">
      <n-form-item v-if="content" label="">
        <p style="margin: 0">{{ content }}</p>
      </n-form-item>
      <n-form-item v-if="recordInfo" label="记录信息">
        <n-descriptions :column="1" bordered size="small">
          <n-descriptions-item v-if="recordInfo.patientName" label="病人">
            {{ recordInfo.patientName }}
          </n-descriptions-item>
          <n-descriptions-item v-if="recordInfo.itemName" label="项目">
            {{ recordInfo.itemName }}
          </n-descriptions-item>
          <n-descriptions-item v-if="recordInfo.amount !== undefined" label="量">
            {{ recordInfo.amount }} {{ recordInfo.unit }}
          </n-descriptions-item>
          <n-descriptions-item v-if="recordInfo.name && !recordInfo.patientName" label="姓名">
            {{ recordInfo.name }}
          </n-descriptions-item>
        </n-descriptions>
      </n-form-item>
      <n-form-item label="操作人" required>
        <n-input
          v-model:value="operatorName"
          placeholder="请输入操作人姓名"
          @keyup.enter="handleConfirm"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button
          type="primary"
          :disabled="!operatorName.trim()"
          @click="handleConfirm"
        >
          确定
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
  title?: string
  content?: string
  recordInfo?: any
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  content: ''
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', operatorName: string): void
  (e: 'cancel'): void
}>()

const LAST_OPERATOR_KEY = 'lastOperatorName'
const operatorName = ref('')

const initOperatorName = () => {
  const savedName = localStorage.getItem(LAST_OPERATOR_KEY)
  if (savedName) {
    operatorName.value = savedName
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      initOperatorName()
    }
  }
)

const handleConfirm = () => {
  if (!operatorName.value.trim()) return

  localStorage.setItem(LAST_OPERATOR_KEY, operatorName.value.trim())
  emit('confirm', operatorName.value.trim())
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

initOperatorName()
</script>