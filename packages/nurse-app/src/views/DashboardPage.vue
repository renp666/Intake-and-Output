<template>
  <div class="dashboard-page">
    <n-spin :show="loading">
      <div class="stat-cards">
        <n-card class="stat-card">
          <n-statistic label="在院人数">
            <template #prefix>
              <n-icon color="#1890ff"><TeamOutlined /></n-icon>
            </template>
            {{ stats.patientCount }}
          </n-statistic>
        </n-card>
        <n-card class="stat-card">
          <n-statistic label="待确认记录">
            <template #prefix>
              <n-icon color="#faad14"><FileExclamationOutlined /></n-icon>
            </template>
            {{ stats.pendingRecords }}
          </n-statistic>
        </n-card>
        <n-card class="stat-card">
          <n-statistic label="今日入量">
            <template #prefix>
              <n-icon color="#52c41a"><ArrowDownOutlined /></n-icon>
            </template>
            {{ stats.todayIntake }} ml
          </n-statistic>
        </n-card>
        <n-card class="stat-card">
          <n-statistic label="预警数">
            <template #prefix>
              <n-icon color="#ff4d4f"><AlertOutlined /></n-icon>
            </template>
            {{ stats.alertCount }}
          </n-statistic>
        </n-card>
      </div>

      <n-grid :cols="2" :x-gap="24" :y-gap="24" style="margin-top: 24px">
        <n-gi>
          <n-card title="待确认记录">
            <template #header-extra>
              <n-button
                type="primary"
                size="small"
                :disabled="selectedRecords.length === 0"
                @click="handleBatchConfirm"
              >
                批量确认 ({{ selectedRecords.length }})
              </n-button>
            </template>
            <n-data-table
              :columns="pendingColumns"
              :data="pendingRecords"
              :pagination="false"
              :row-key="(row: any) => row.id"
              v-model:checked-row-keys="selectedRecords"
              max-height="400"
              size="small"
            />
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="预警信息">
            <n-list bordered>
              <n-list-item v-for="alert in alerts" :key="alert.id">
                <n-thing>
                  <template #header>
                    <n-space align="center">
                      <n-tag :type="alert.level === 'danger' ? 'error' : 'warning'" size="small">
                        {{ alert.level === 'danger' ? '危险' : '警告' }}
                      </n-tag>
                      <span>{{ alert.patientName }}</span>
                      <n-text depth="3" style="font-size: 12px">
                        {{ alert.bedNumber ? `床位 ${alert.bedNumber}` : '' }}
                      </n-text>
                    </n-space>
                  </template>
                  <template #description>
                    <n-text depth="3">{{ alert.message }}</n-text>
                  </template>
                  <template #footer>
                    <n-space justify="end">
                      <n-button size="tiny" @click="handleReadAlert(alert.id)">
                        标记已读
                      </n-button>
                    </n-space>
                  </template>
                </n-thing>
              </n-list-item>
              <n-empty v-if="alerts.length === 0" description="暂无预警" />
            </n-list>
          </n-card>
        </n-gi>
      </n-grid>
    </n-spin>

    <ConfirmDialog
      v-model:visible="showConfirmDialog"
      title="确认记录"
      content="请输入操作人姓名以确认记录"
      :record-info="currentRecord"
      @confirm="handleConfirmSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useMessage, NButton, NTag, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  TeamOutlined,
  FileExclamationOutlined,
  ArrowDownOutlined,
  AlertOutlined
} from '@vicons/antd'
import { recordsApi, type IntakeOutputRecord } from '@/api/modules/records'
import { alertsApi, type Alert } from '@/api/modules/alerts'
import { patientsApi } from '@/api/modules/patients'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const message = useMessage()
const loading = ref(false)

const stats = ref({
  patientCount: 0,
  pendingRecords: 0,
  todayIntake: 0,
  alertCount: 0
})

const pendingRecords = ref<IntakeOutputRecord[]>([])
const selectedRecords = ref<number[]>([])
const alerts = ref<Alert[]>([])
const showConfirmDialog = ref(false)
const currentRecord = ref<IntakeOutputRecord | null>(null)

const pendingColumns: DataTableColumns<IntakeOutputRecord> = [
  {
    type: 'selection'
  },
  {
    title: '时间',
    key: 'recordTime',
    width: 120,
    render: (row) => {
      return new Date(row.recordTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  {
    title: '病人',
    key: 'patientName',
    width: 100
  },
  {
    title: '项目',
    key: 'itemName',
    width: 120
  },
  {
    title: '量',
    key: 'amount',
    width: 80,
    render: (row) => `${row.amount} ${row.unit}`
  },
  {
    title: '类型',
    key: 'type',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.type === 'intake' ? 'success' : 'warning',
        size: 'small'
      }, { default: () => row.type === 'intake' ? '入量' : '出量' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleConfirm(row)
          }, { default: () => '确认' })
        ]
      })
    }
  }
]

const loadData = async () => {
  loading.value = true
  try {
    const [pendingRes, alertsRes, patientsRes, summaryRes] = await Promise.all([
      recordsApi.list({ status: 'pending', pageSize: 50 }),
      alertsApi.list({ isRead: false, pageSize: 10 }),
      patientsApi.list({ status: 'admitted', pageSize: 1 }),
      recordsApi.getTodaySummary()
    ])

    pendingRecords.value = pendingRes.items || []
    alerts.value = alertsRes.items || []
    stats.value = {
      patientCount: patientsRes.total || 0,
      pendingRecords: pendingRes.total || 0,
      todayIntake: summaryRes.intake || 0,
      alertCount: alertsRes.unreadCount || 0
    }
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleConfirm = (record: IntakeOutputRecord) => {
  currentRecord.value = record
  showConfirmDialog.value = true
}

const handleConfirmSubmit = async (operatorName: string) => {
  if (!currentRecord.value) return

  try {
    await recordsApi.confirm(currentRecord.value.id, { operatorName })
    message.success('确认成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '确认失败')
  }
}

const handleBatchConfirm = async () => {
  if (selectedRecords.value.length === 0) return

  currentRecord.value = null
  showConfirmDialog.value = true
}

const handleReadAlert = async (id: number) => {
  try {
    await alertsApi.markAsRead(id)
    alerts.value = alerts.value.filter(a => a.id !== id)
    stats.value.alertCount = alerts.value.length
    message.success('已标记为已读')
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  text-align: center;
}

:deep(.n-statistic .n-statistic-value__content) {
  font-size: 32px;
  font-weight: bold;
}
</style>