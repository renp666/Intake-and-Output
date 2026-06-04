<template>
  <div class="statistics-page">
    <n-card title="统计分析">
      <n-form inline :model="filters" label-placement="left" style="margin-bottom: 16px">
        <n-form-item label="时间范围">
          <n-select
            v-model:value="filters.type"
            :options="timeTypeOptions"
            style="width: 120px"
            @update:value="loadData"
          />
        </n-form-item>
        <n-form-item v-if="filters.type === 'custom'" label="自定义">
          <n-date-picker
            v-model:value="filters.timeRange"
            type="daterange"
            clearable
            style="width: 280px"
          />
        </n-form-item>
        <n-form-item label="病人">
          <n-select
            v-model:value="filters.patientId"
            :options="patientOptions"
            placeholder="选择病人"
            filterable
            clearable
            style="width: 200px"
          />
        </n-form-item>
        <n-form-item label="床位">
          <n-select
            v-model:value="filters.bedNumber"
            :options="bedOptions"
            placeholder="选择床位"
            clearable
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item label="班次">
          <n-select
            v-model:value="filters.shiftId"
            :options="shiftOptions"
            placeholder="选择班次"
            clearable
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="loadData">查询</n-button>
        </n-form-item>
      </n-form>

      <n-spin :show="loading">
        <n-grid :cols="3" :x-gap="16" :y-gap="16" style="margin-bottom: 24px">
          <n-gi>
            <n-card>
              <n-statistic label="入量总计">
                <template #prefix>
                  <n-icon color="#52c41a"><ArrowDownOutlined /></n-icon>
                </template>
                {{ summary.intake }} ml
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card>
              <n-statistic label="出量总计">
                <template #prefix>
                  <n-icon color="#fa8c16"><ArrowUpOutlined /></n-icon>
                </template>
                {{ summary.output }} ml
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card>
              <n-statistic label="出入平衡">
                <template #prefix>
                  <n-icon :color="summary.balance >= 0 ? '#52c41a' : '#ff4d4f'"><SwapOutlined /></n-icon>
                </template>
                <span :style="{ color: summary.balance >= 0 ? '#52c41a' : '#ff4d4f' }">
                  {{ summary.balance >= 0 ? '+' : '' }}{{ summary.balance }} ml
                </span>
              </n-statistic>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="24" :y-gap="24">
          <n-gi>
            <n-card title="出入量趋势">
              <div ref="trendChartRef" style="height: 350px"></div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="入量/出量分布">
              <div ref="distributionChartRef" style="height: 350px"></div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-card title="项目明细" style="margin-top: 24px">
          <n-grid :cols="2" :x-gap="24">
            <n-gi>
              <h4>入量项目</h4>
              <n-list bordered>
                <n-list-item v-for="item in intakeItems" :key="item.itemName">
                  <n-space align="center" justify="space-between" style="width: 100%">
                    <span>{{ item.itemName }}</span>
                    <n-space align="center">
                      <n-progress
                        type="line"
                        :percentage="getPercentage(item.amount, summary.intake)"
                        :show-indicator="false"
                        style="width: 100px"
                        color="#52c41a"
                      />
                      <span>{{ item.amount }} {{ item.unit }}</span>
                    </n-space>
                  </n-space>
                </n-list-item>
                <n-list-item v-if="intakeItems.length === 0">
                  <n-empty description="暂无入量数据" />
                </n-list-item>
              </n-list>
            </n-gi>
            <n-gi>
              <h4>出量项目</h4>
              <n-list bordered>
                <n-list-item v-for="item in outputItems" :key="item.itemName">
                  <n-space align="center" justify="space-between" style="width: 100%">
                    <span>{{ item.itemName }}</span>
                    <n-space align="center">
                      <n-progress
                        type="line"
                        :percentage="getPercentage(item.amount, summary.output)"
                        :show-indicator="false"
                        style="width: 100px"
                        color="#fa8c16"
                      />
                      <span>{{ item.amount }} {{ item.unit }}</span>
                    </n-space>
                  </n-space>
                </n-list-item>
                <n-list-item v-if="outputItems.length === 0">
                  <n-empty description="暂无出量数据" />
                </n-list-item>
              </n-list>
            </n-gi>
          </n-grid>
        </n-card>
      </n-spin>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px">
        <n-button @click="handleExport('excel')">
          导出 Excel
        </n-button>
        <n-button @click="handleExport('pdf')">
          导出 PDF
        </n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import * as echarts from 'echarts'
import { ArrowDownOutlined, ArrowUpOutlined, SwapOutlined } from '@vicons/antd'
import { statisticsApi, type DailyStatistics } from '@/api/modules/statistics'
import { patientsApi } from '@/api/modules/patients'
import { bedsApi } from '@/api/modules/beds'
import { configApi } from '@/api/modules/config'
import { exportApi } from '@/api/modules/export'

const message = useMessage()
const loading = ref(false)

const filters = reactive({
  type: '24h' as string,
  timeRange: null as [number, number] | null,
  patientId: null as string | null,
  bedNumber: null as string | null,
  shiftId: null as string | null
})

const timeTypeOptions = [
  { label: '24小时', value: '24h' },
  { label: '自定义', value: 'custom' }
]

const patientOptions = ref<Array<{ label: string; value: string }>>([])
const bedOptions = ref<Array<{ label: string; value: string }>>([])
const shiftOptions = ref<Array<{ label: string; value: string }>>([])

const statisticsData = ref<DailyStatistics[]>([])

const summary = computed(() => {
  const intake = statisticsData.value.reduce((sum, item) => sum + item.intake.total, 0)
  const output = statisticsData.value.reduce((sum, item) => sum + item.output.total, 0)
  return {
    intake,
    output,
    balance: intake - output
  }
})

const intakeItems = computed(() => {
  const itemsMap = new Map<string, { itemName: string; amount: number; unit: string }>()
  statisticsData.value.forEach(stat => {
    stat.intake.items.forEach(item => {
      const existing = itemsMap.get(item.itemName)
      if (existing) {
        existing.amount += item.amount
      } else {
        itemsMap.set(item.itemName, { ...item })
      }
    })
  })
  return Array.from(itemsMap.values())
})

const outputItems = computed(() => {
  const itemsMap = new Map<string, { itemName: string; amount: number; unit: string }>()
  statisticsData.value.forEach(stat => {
    stat.output.items.forEach(item => {
      const existing = itemsMap.get(item.itemName)
      if (existing) {
        existing.amount += item.amount
      } else {
        itemsMap.set(item.itemName, { ...item })
      }
    })
  })
  return Array.from(itemsMap.values())
})

const trendChartRef = ref<HTMLElement | null>(null)
const distributionChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null
let distributionChart: echarts.ECharts | null = null

const getPercentage = (value: number, total: number) => {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function normalizeStatisticsData(data: any): DailyStatistics[] {
  const stats = data?.stats
  if (!stats) {
    return []
  }

  const items = stats.items || {}
  const date = data.endTime || data.endDate || new Date().toISOString()

  return [
    {
      date: new Date(date).toLocaleString('zh-CN'),
      patientId: filters.patientId,
      patientName: '',
      hospitalNumber: '',
      bedNumber: filters.bedNumber || '',
      intake: {
        total: stats.intake || 0,
        items: Object.entries(items)
          .filter(([, value]: any) => value.intake > 0)
          .map(([itemName, value]: [string, any]) => ({
            itemId: itemName,
            itemName,
            amount: value.intake,
            unit: 'ml',
          })),
      },
      output: {
        total: stats.output || 0,
        items: Object.entries(items)
          .filter(([, value]: any) => value.output > 0)
          .map(([itemName, value]: [string, any]) => ({
            itemId: itemName,
            itemName,
            amount: value.output,
            unit: 'ml',
          })),
      },
      balance: stats.balance || 0,
      shiftSummaries: [],
    },
  ]
}

const loadData = async (showMissingTargetMessage = true) => {
  if (!filters.patientId && !filters.bedNumber) {
    statisticsData.value = []
    await nextTick()
    updateCharts()
    if (showMissingTargetMessage) {
      message.warning('请选择病人或床位')
    }
    return
  }

  loading.value = true
  try {
    const params: any = {
      type: filters.type,
      patientId: filters.patientId || undefined,
      bedNumber: filters.bedNumber || undefined,
      shiftId: filters.shiftId || undefined
    }

    if (filters.type === 'custom' && filters.timeRange) {
      params.startDate = new Date(filters.timeRange[0]).toISOString()
      params.endDate = new Date(filters.timeRange[1]).toISOString()
    }

    const data = filters.type === '24h'
      ? await statisticsApi.daily(params)
      : await statisticsApi.custom(params)

    statisticsData.value = normalizeStatisticsData(data)
    await nextTick()
    updateCharts()
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const updateCharts = () => {
  if (trendChart) {
    const dates = statisticsData.value.map(item => item.date)
    const intakeData = statisticsData.value.map(item => item.intake.total)
    const outputData = statisticsData.value.map(item => item.output.total)

    trendChart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['入量', '出量']
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        name: 'ml'
      },
      series: [
        {
          name: '入量',
          type: 'bar',
          data: intakeData,
          itemStyle: { color: '#52C41A' }
        },
        {
          name: '出量',
          type: 'bar',
          data: outputData,
          itemStyle: { color: '#FA8C16' }
        }
      ]
    })
  }

  if (distributionChart) {
    const intakeTotal = summary.value.intake
    const outputTotal = summary.value.output

    distributionChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ml ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: [
            { value: intakeTotal, name: '入量', itemStyle: { color: '#52C41A' } },
            { value: outputTotal, name: '出量', itemStyle: { color: '#FA8C16' } }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    })
  }
}

const initCharts = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (distributionChartRef.value) {
    distributionChart = echarts.init(distributionChartRef.value)
  }
}

const handleResize = () => {
  trendChart?.resize()
  distributionChart?.resize()
}

const loadOptions = async () => {
  try {
    const [patientsRes, bedsRes, shiftsRes] = await Promise.all([
      patientsApi.list({ status: 'admitted', pageSize: 100 }),
      bedsApi.list({ pageSize: 100 }),
      configApi.getShifts()
    ])

    patientOptions.value = (patientsRes.items || []).map(p => ({
      label: `${p.name} (${p.hospitalNumber})`,
      value: String(p.id)
    }))

    bedOptions.value = (bedsRes.items || []).map(b => ({
      label: b.number,
      value: b.number
    }))

    shiftOptions.value = (shiftsRes || []).map(s => ({
      label: s.name,
      value: String(s.id)
    }))
  } catch (error) {
    // ignore
  }
}

const handleExport = async (format: 'excel' | 'pdf') => {
  try {
    const params: any = {
      format,
      type: filters.type,
      patientId: filters.patientId || undefined,
      bedNumber: filters.bedNumber || undefined,
      shiftId: filters.shiftId || undefined
    }

    if (filters.type === 'custom' && filters.timeRange) {
      params.startDate = new Date(filters.timeRange[0]).toISOString()
      params.endDate = new Date(filters.timeRange[1]).toISOString()
    }

    const blob = await statisticsApi.exportData(params)
    const url = window.URL.createObjectURL(blob as any)
    const a = document.createElement('a')
    a.href = url
    a.download = `statistics.${format === 'excel' ? 'xlsx' : 'pdf'}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    message.success('导出成功')
  } catch (error: any) {
    message.error(error.message || '导出失败')
  }
}

onMounted(() => {
  initCharts()
  loadData(false)
  loadOptions()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  distributionChart?.dispose()
})
</script>

<style scoped>
.statistics-page {
  min-height: 100%;
}

:deep(.n-statistic .n-statistic-value__content) {
  font-size: 28px;
  font-weight: bold;
}
</style>
