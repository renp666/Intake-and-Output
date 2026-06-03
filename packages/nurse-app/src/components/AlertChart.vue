<template>
  <div ref="chartRef" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: any
  type?: 'bar' | 'line' | 'pie'
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bar',
  width: '100%',
  height: '350px'
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const intakeColor = '#52C41A'
const outputColor = '#FA8C16'
const thresholdColor = '#FF4D4F'

const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart || !props.data) return

  let option: echarts.EChartsOption = {}

  switch (props.type) {
    case 'bar':
      option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['入量', '出量']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: props.data.dates || []
        },
        yAxis: {
          type: 'value',
          name: 'ml'
        },
        series: [
          {
            name: '入量',
            type: 'bar',
            data: props.data.intake || [],
            itemStyle: { color: intakeColor }
          },
          {
            name: '出量',
            type: 'bar',
            data: props.data.output || [],
            itemStyle: { color: outputColor }
          }
        ]
      }
      break

    case 'line':
      option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['入量', '出量', '阈值']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: props.data.dates || [],
          boundaryGap: false
        },
        yAxis: {
          type: 'value',
          name: 'ml'
        },
        series: [
          {
            name: '入量',
            type: 'line',
            data: props.data.intake || [],
            itemStyle: { color: intakeColor },
            smooth: true
          },
          {
            name: '出量',
            type: 'line',
            data: props.data.output || [],
            itemStyle: { color: outputColor },
            smooth: true
          },
          {
            name: '阈值',
            type: 'line',
            data: props.data.threshold || [],
            itemStyle: { color: thresholdColor },
            lineStyle: { type: 'dashed' }
          }
        ]
      }
      break

    case 'pie':
      option = {
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
            data: props.data.items || [],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            itemStyle: {
              color: (params: any) => {
                const colors = [intakeColor, outputColor, '#1890FF', '#722ED1', '#13C2C2', '#FADB14']
                return colors[params.dataIndex % colors.length]
              }
            }
          }
        ]
      }
      break
  }

  chart.setOption(option, true)
}

const handleResize = () => {
  chart?.resize()
}

watch(
  () => props.data,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

watch(
  () => props.type,
  () => {
    nextTick(() => {
      updateChart()
    })
  }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>