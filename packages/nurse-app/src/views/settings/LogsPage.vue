<template>
  <n-card title="操作日志">
    <n-form inline :model="filters" label-placement="left" style="margin-bottom: 16px">
      <n-form-item label="用户">
        <n-input
          v-model:value="filters.username"
          placeholder="用户名"
          clearable
          style="width: 140px"
        />
      </n-form-item>
      <n-form-item label="操作类型">
        <n-select
          v-model:value="filters.action"
          :options="actionOptions"
          placeholder="选择类型"
          clearable
          style="width: 140px"
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
        <n-button type="primary" @click="loadData">查询</n-button>
        <n-button style="margin-left: 8px" @click="resetFilters">重置</n-button>
      </n-form-item>
    </n-form>

    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row: any) => row.id"
      remote
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </n-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { logsApi, type OperationLog } from '@/api/modules/logs'

const message = useMessage()
const loading = ref(false)
const logs = ref<OperationLog[]>([])

const filters = reactive({
  username: '',
  action: null as string | null,
  timeRange: null as [number, number] | null
})

const actionOptions = [
  { label: '登录', value: 'login' },
  { label: '创建记录', value: 'create_record' },
  { label: '确认记录', value: 'confirm_record' },
  { label: '删除记录', value: 'delete_record' },
  { label: '添加病人', value: 'create_patient' },
  { label: '编辑病人', value: 'update_patient' },
  { label: '病人出院', value: 'discharge_patient' },
  { label: '绑定床位', value: 'bind_bed' },
  { label: '解绑床位', value: 'unbind_bed' }
]

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: (info: any) => `共 ${info?.itemCount ?? 0} 条`
})

const columns: DataTableColumns<OperationLog> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString('zh-CN')
  },
  { title: '用户', key: 'userName', width: 100 },
  { title: '操作', key: 'action', width: 120 },
  { title: '目标', key: 'target', width: 120 },
  { title: '详情', key: 'detail', ellipsis: { tooltip: true } }
]

const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      username: filters.username || undefined,
      action: filters.action || undefined
    }

    if (filters.timeRange) {
      params.startTime = new Date(filters.timeRange[0]).toISOString()
      params.endTime = new Date(filters.timeRange[1]).toISOString()
    }

    const res = await logsApi.list(params)
    logs.value = res.items || []
    pagination.itemCount = res.total || 0
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.username = ''
  filters.action = null
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

onMounted(() => {
  loadData()
})
</script>