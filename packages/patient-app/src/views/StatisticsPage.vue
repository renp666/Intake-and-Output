<template>
  <div class="page-container page-container--no-tabbar">
    <!-- Navigation Bar -->
    <van-nav-bar
      title="统计"
      left-text="返回"
      left-arrow
      @click-left="goBack"
      :border="true"
    />

    <!-- Time Range Selector -->
    <div class="stats-tabs">
      <div
        :class="['stats-tabs__item', { 'stats-tabs__item--active': timeRange === '24h' }]"
        @click="timeRange = '24h'"
      >
        24小时
      </div>
      <div
        :class="['stats-tabs__item', { 'stats-tabs__item--active': timeRange === 'today' }]"
        @click="timeRange = 'today'"
      >
        今日
      </div>
    </div>

    <!-- Loading State -->
    <van-loading v-if="loading" size="48px" vertical class="stats-loading">加载中...</van-loading>

    <template v-else>
      <!-- Summary Cards -->
      <div class="stats-summary">
        <div class="stats-card stats-card--intake">
          <div class="stats-card__label">入量</div>
          <div class="stats-card__value">{{ stats.intakeTotal }}</div>
          <div class="stats-card__unit">ml</div>
        </div>
        <div class="stats-card stats-card--output">
          <div class="stats-card__label">出量</div>
          <div class="stats-card__value">{{ stats.outputTotal }}</div>
          <div class="stats-card__unit">ml</div>
        </div>
        <div class="stats-card stats-card--balance">
          <div class="stats-card__label">平衡</div>
          <div class="stats-card__value">{{ stats.balance > 0 ? '+' : '' }}{{ stats.balance }}</div>
          <div class="stats-card__unit">ml</div>
        </div>
      </div>

      <!-- Intake Breakdown -->
      <div class="stats-breakdown card">
        <div class="section-title">
          <span>入量明细</span>
        </div>
        <div class="stats-breakdown__list">
          <div
            v-for="item in stats.intakeBreakdown"
            :key="item.projectCode"
            class="stats-breakdown__item"
          >
            <div class="stats-breakdown__header">
              <span class="stats-breakdown__name">{{ item.projectName }}</span>
              <span class="stats-breakdown__amount">{{ item.total }}ml</span>
            </div>
            <van-progress
              :percentage="item.percentage"
              color="#52C41A"
              track-color="#F0FFF0"
              :show-pivot="false"
              stroke-width="8"
            />
            <div class="stats-breakdown__meta">
              {{ item.count }}次 · {{ item.percentage }}%
            </div>
          </div>
          <div v-if="stats.intakeBreakdown.length === 0" class="empty-state">
            <div class="empty-state__text">暂无入量记录</div>
          </div>
        </div>
      </div>

      <!-- Output Breakdown -->
      <div class="stats-breakdown card">
        <div class="section-title">
          <span>出量明细</span>
        </div>
        <div class="stats-breakdown__list">
          <div
            v-for="item in stats.outputBreakdown"
            :key="item.projectCode"
            class="stats-breakdown__item"
          >
            <div class="stats-breakdown__header">
              <span class="stats-breakdown__name">{{ item.projectName }}</span>
              <span class="stats-breakdown__amount">{{ item.total }}ml</span>
            </div>
            <van-progress
              :percentage="item.percentage"
              color="#FA8C16"
              track-color="#FFF7E6"
              :show-pivot="false"
              stroke-width="8"
            />
            <div class="stats-breakdown__meta">
              {{ item.count }}次 · {{ item.percentage }}%
            </div>
          </div>
          <div v-if="stats.outputBreakdown.length === 0" class="empty-state">
            <div class="empty-state__text">暂无出量记录</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDailyStats } from '@/api/modules/statistics'
import type { DailyStats, ProjectBreakdown } from '@/api/modules/statistics'

const router = useRouter()
const authStore = useAuthStore()

const timeRange = ref<'24h' | 'today'>('24h')
const loading = ref(false)

const stats = ref({
  intakeTotal: 0,
  outputTotal: 0,
  balance: 0,
  intakeBreakdown: [] as ProjectBreakdown[],
  outputBreakdown: [] as ProjectBreakdown[],
})

onMounted(() => {
  fetchStats()
})

watch(timeRange, () => {
  fetchStats()
})

async function fetchStats() {
  loading.value = true
  try {
    const data = await getDailyStats(authStore.patientId, {
      period: timeRange.value,
    })

    if (data) {
      stats.value = {
        intakeTotal: data.intakeTotal || 0,
        outputTotal: data.outputTotal || 0,
        balance: data.balance || 0,
        intakeBreakdown: data.intakeBreakdown || [],
        outputBreakdown: data.outputBreakdown || [],
      }
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<style lang="less" scoped>
.stats-tabs {
  display: flex;
  background: #FFFFFF;
  padding: 12px 16px;
  gap: 12px;

  &__item {
    flex: 1;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #F5F5F5;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;

    &--active {
      background: #1890FF;
      color: #FFFFFF;
    }
  }
}

.stats-loading {
  padding: 60px 0;
}

.stats-summary {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.stats-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &__label {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__unit {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  &--intake {
    .stats-card__value {
      color: #52C41A;
    }
  }

  &--output {
    .stats-card__value {
      color: #FA8C16;
    }
  }

  &--balance {
    .stats-card__value {
      color: #1890FF;
    }
  }
}

.stats-breakdown {
  margin: 0 16px 16px;

  &__list {
    padding: 0 16px 16px;
  }

  &__item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__name {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  &__amount {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    font-variant-numeric: tabular-nums;
  }

  &__meta {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }
}
</style>
