<template>
  <n-card title="系统配置">
    <n-spin :show="loading">
      <n-form
        ref="formRef"
        :model="formData"
        label-placement="left"
        label-width="180"
        style="max-width: 600px"
      >
        <n-card title="预警阈值配置" style="margin-bottom: 24px">
          <n-form-item label="少尿因子 (ml/kg/h)">
            <n-input-number v-model:value="formData.oliguriaFactor" :min="0" :max="100" :step="0.1" style="width: 200px" />
          </n-form-item>
          <n-form-item label="默认尿量阈值 (ml/h)">
            <n-input-number v-model:value="formData.defaultThreshold" :min="0" :max="1000" style="width: 200px" />
          </n-form-item>
          <n-form-item label="多尿阈值 (ml/h)">
            <n-input-number v-model:value="formData.polyuriaThreshold" :min="0" :max="5000" style="width: 200px" />
          </n-form-item>
          <n-form-item label="无尿阈值 (ml/h)">
            <n-input-number v-model:value="formData.anuriaThreshold" :min="0" :max="100" style="width: 200px" />
          </n-form-item>
          <n-form-item label="出入失衡阈值 (ml)">
            <n-input-number v-model:value="formData.imbalanceThreshold" :min="0" :max="10000" style="width: 200px" />
          </n-form-item>
          <n-form-item label="变化百分比阈值 (%)">
            <n-input-number v-model:value="formData.changePercentThreshold" :min="0" :max="100" style="width: 200px" />
          </n-form-item>
        </n-card>

        <n-card title="数据备份">
          <n-space>
            <n-button type="primary" @click="handleBackup">
              立即备份
            </n-button>
            <n-button @click="handleRestore">
              恢复数据
            </n-button>
          </n-space>
        </n-card>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end">
          <n-button type="primary" :loading="saving" @click="handleSave">
            保存配置
          </n-button>
        </div>
      </n-form>
    </n-spin>
  </n-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useMessage, type FormInst } from 'naive-ui'
import { alertsApi, type AlertConfig } from '@/api/modules/alerts'

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInst | null>(null)

const formData = reactive<AlertConfig>({
  oliguriaFactor: 0.5,
  defaultThreshold: 30,
  polyuriaThreshold: 200,
  anuriaThreshold: 10,
  imbalanceThreshold: 500,
  changePercentThreshold: 20
})

const loadConfig = async () => {
  loading.value = true
  try {
    const config = await alertsApi.getConfig()
    Object.assign(formData, config)
  } catch (error: any) {
    message.error(error.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await alertsApi.updateConfig(formData)
    message.success('保存成功')
  } catch (error: any) {
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleBackup = () => {
  message.info('备份功能开发中...')
}

const handleRestore = () => {
  message.info('恢复功能开发中...')
}

onMounted(() => {
  loadConfig()
})
</script>