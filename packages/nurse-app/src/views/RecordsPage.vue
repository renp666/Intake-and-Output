<template>
  <div class="records-page">
    <n-card title="记录查询">
      <n-form inline :model="filters" label-placement="left" style="margin-bottom: 16px">
        <n-form-item label="关键字">
          <n-input v-model:value="filters.keyword" placeholder="病人姓名/住院号" clearable style="width: 180px" />
        </n-form-item>
        <n-form-item label="床位">
          <n-select
            v-model:value="filters.bedId"
            :options="bedOptions"
            placeholder="选择床位"
            clearable
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item label="类型">
          <n-select
            v-model:value="filters.type"
            :options="typeOptions"
            placeholder="选择类型"
            clearable
            style="width: 120px"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="filters.status"
            :options="statusOptions"
            placeholder="选择状态"
            clearable
            style="width: 120px"
          />
        </n-form-item>
        <n-form-item label="时间">
          <n-date-picker
            v-model:value="filters.timeRange"
            type="daterange"
            clearable
            style="width: 280px"
          />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="loadData">
            查询
          </n-button>
          <n-button style="margin-left: 8px" @click="resetFilters">
            重置
          </n-button>
        </n-form-item>
      </n-form>

      <n-data-table
        :columns="columns"
        :data="records"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: any) => row.id"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <n-modal v-model:visible="showHistoryModal" title="操作历史" style="width: 600px">
      <n-data-table
        :columns="historyColumns"
        :data="historyRecords"
        :loading="historyLoading"
        :pagination="false"
        max-height="400"
      />
    </n-modal>

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
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NTag, NSpace, NPopconfirm } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { recordsApi, type IntakeOutputRecord, type RecordHistory } from '@/api/modules/records'
import { bedsApi } from '@/api/modules/beds'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const message = useMessage()
const loading = ref(false)
const records = ref<IntakeOutputRecord[]>([])
const bedOptions = ref<Array<{ label: string; value: number }>>([])

const filters = reactive({
  keyword: '',
  bedId: null as number | null,
  type: null as string | null,
  status: null as string | null,
  timeRange: null as [number, number] | null
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 条`
})

const typeOptions = [
  { label: '入量', value: 'intake' },
  { label: '出量', value: 'output' }
]

const statusOptions = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已删除', value: 'deleted' }
]

const columns: DataTableColumns<IntakeOutputRecord> = [
  {
    title: '时间',
    key: 'recordTime',
    width: 150,
    render: (row) => {
      return new Date(row.recordTime).toLocaleString('zh-CN')
    }
  },
  {
    title: '床位',
    key: 'bedNumber',
    width: 80,
    render: (row) => row.bedNumber || '-'
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
    width: 100,
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
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const statusMap: Record<string, { type: string; label: string }> = {
        pending: { type: 'warning', label: '待确认' },
        confirmed: { type: 'success', label: '已确认' },
        deleted: { type: 'error', label: '已删除' }
      }
      const status = statusMap[row.status] || { type: 'default', label: row.status }
      return h(NTag, { type: status.type as any, size: 'small' }, { default: () => status.label })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) => {
      const buttons = []

      if (row.status === 'pending') {
        buttons.push(
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleConfirm(row)
          }, { default: () => '确认' })
        )
      }

      if (row.status === 'deleted') {
        buttons.push(
          h(NPopconfirm, {
            onPositiveClick: () => handleRestore(row.id)
          }, {
            trigger: () => h(NButton, { size: 'small', type: 'info' }, { default: () => '恢复' }),
            default: () => '确定恢复此记录？'
          })
        )
      }

      buttons.push(
        h(NButton, {
          size: 'small',
          onClick: () => viewHistory(row.id)
        }, { default: () => '历史' })
      )

      return h(NSpace, { size: 'small' }, { default: () => buttons })
    }
  }
]

const showHistoryModal = ref(false)
const historyRecords = ref<RecordHistory[]>([])
const historyLoading = ref(false)

const historyColumns: DataTableColumns<RecordHistory> = [
  { title: '时间', key: 'createdAt', width: 150 },
  { title: '操作', key: 'action', width: 100 },
  { title: '操作人', key: 'operatorName', width: 100 },
  { title: '详情', key: 'detail' }
]

const showConfirmDialog = ref(false)
const currentRecord = ref<IntakeOutputRecord | null>(null)

const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      bedId: filters.bedId || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined
    }

    if (filters.timeRange) {
      params.startTime = new Date(filters.timeRange[0]).toISOString()
      params.endTime = new Date(filters.timeRange[1]).toISOString()
    }

    const res = await recordsApi.list(params)
    records.value = res.items || []
    pagination.itemCount = res.total || 0
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadBeds = async () => {
  try {
    const res = await bedsApi.list({ pageSize: 100 })
    bedOptions.value = (res.items || []).map(bed => ({
      label: `${bed.number}${bed.patientName ? ` (${bed.patientName})` : ''}`,
      value: bed.id
    }))
  } catch (error) {
    // ignore
  }
}

const resetFilters = () => {
  filters.keyword = ''
  filters.bedId = null
  filters.type = null
  filters.status = null
  filters.timeRange = null
  pagination.page = 1
  loadData()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadData()
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

const handleRestore = async (id: number) => {
  try {
    await recordsApi.restore(id)
    message.success('恢复成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '恢复失败')
  }
}

const viewHistory = async (id: number) => {
  showHistoryModal.value = true
  historyLoading.value = true
  try {
    historyRecords.value = await recordsApi.getHistory(id)
  } catch (error: any) {
    message.error(error.message || '加载历史失败')
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  loadData()
  loadBeds()
})
</script>

<style scoped>
.records-page {
  min-height: 100%;
}
</style>