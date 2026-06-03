<template>
  <div class="page-container">
    <!-- Top Bar -->
    <div class="home-topbar">
      <div class="home-topbar__left">
        <span class="home-topbar__bed-icon">🛏️</span>
        <span class="home-topbar__bed-number">{{ bedNumber }}床</span>
      </div>
      <van-icon name="setting-o" size="22" color="#666" @click="goToSettings" />
    </div>

    <!-- Patient Info -->
    <div class="home-greeting">
      <h2 class="home-greeting__name">{{ patientName }}，您好</h2>
      <p class="home-greeting__date">{{ todayDate }}</p>
    </div>

    <!-- Action Buttons -->
    <div class="home-actions">
      <div class="home-action-btn home-action-btn--intake" @click="goToRecord('intake')">
        <div class="home-action-btn__icon">💧</div>
        <div class="home-action-btn__text">入量</div>
        <div class="home-action-btn__amount">{{ todayIntake }}ml</div>
      </div>
      <div class="home-action-btn home-action-btn--output" @click="goToRecord('output')">
        <div class="home-action-btn__icon">🚽</div>
        <div class="home-action-btn__text">出量</div>
        <div class="home-action-btn__amount">{{ todayOutput }}ml</div>
      </div>
    </div>

    <!-- Today Summary -->
    <div class="home-summary card">
      <div class="section-title">
        <span>今日汇总</span>
        <span class="section-title__action" @click="goToStatistics">查看详情</span>
      </div>
      <div class="home-summary__content">
        <div class="home-summary__item">
          <div class="home-summary__label">入量</div>
          <div class="home-summary__value home-summary__value--intake">
            {{ todayIntake }}
            <span class="home-summary__unit">ml</span>
          </div>
        </div>
        <div class="home-summary__divider"></div>
        <div class="home-summary__item">
          <div class="home-summary__label">出量</div>
          <div class="home-summary__value home-summary__value--output">
            {{ todayOutput }}
            <span class="home-summary__unit">ml</span>
          </div>
        </div>
        <div class="home-summary__divider"></div>
        <div class="home-summary__item">
          <div class="home-summary__label">平衡</div>
          <div class="home-summary__value home-summary__value--balance">
            {{ balance > 0 ? '+' : '' }}{{ balance }}
            <span class="home-summary__unit">ml</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Records -->
    <div class="home-recent card">
      <div class="section-title">
        <span>最近记录</span>
        <span class="section-title__action" @click="goToRecords">查看全部 ></span>
      </div>
      <div class="home-recent__list">
        <van-loading v-if="recordsStore.loading" size="24px" vertical>加载中...</van-loading>
        <template v-else-if="recentRecords.length > 0">
          <div
            v-for="record in recentRecords"
            :key="record.id"
            class="record-item"
          >
            <div :class="['record-item__icon', `record-item__icon--${record.recordType}`]">
              {{ getRecordEmoji(record.projectCode, record.recordType) }}
            </div>
            <div class="record-item__info">
              <div class="record-item__name">{{ record.projectName }}</div>
              <div class="record-item__meta">{{ formatTime(record.recordTime) }}</div>
            </div>
            <div :class="['record-item__amount', `record-item__amount--${record.recordType}`]">
              {{ record.amount }}{{ record.unit }}
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <div class="empty-state__icon">📝</div>
          <div class="empty-state__text">暂无记录</div>
        </div>
      </div>
    </div>

    <!-- Quick Voice Input -->
    <van-button
      class="home-voice-btn"
      icon="chat-o"
      type="primary"
      round
      size="large"
      @click="goToVoice"
    >
      语音录入
    </van-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRecordsStore } from '@/stores/records'
import { formatTime } from '@/utils/format'

const router = useRouter()
const authStore = useAuthStore()
const recordsStore = useRecordsStore()

const bedNumber = computed(() => authStore.bedNumber)
const patientName = computed(() => authStore.patientName)

const todayIntake = computed(() => recordsStore.todayIntakeTotal)
const todayOutput = computed(() => recordsStore.todayOutputTotal)
const balance = computed(() => recordsStore.todayBalance)
const recentRecords = computed(() => recordsStore.recentRecords)

const todayDate = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]}`
})

onMounted(() => {
  // Fetch recent records
  recordsStore.refresh()
})

function getRecordEmoji(code: string, type: string): string {
  const emojiMap: Record<string, string> = {
    water: '💧',
    soup: '🍜',
    milk: '🥛',
    juice: '🧃',
    liquid: '🥤',
    semi_liquid: '🥣',
    urine: '💧',
    stool: '💩',
    vomit: '🤢',
    other_intake: '📦',
    other_output: '📦',
  }
  return emojiMap[code] || (type === 'intake' ? '💧' : '🚽')
}

function goToRecord(type: 'intake' | 'output') {
  router.push(`/record/${type}`)
}

function goToRecords() {
  router.push('/records')
}

function goToStatistics() {
  router.push('/statistics')
}

function goToVoice() {
  router.push('/voice')
}

function goToSettings() {
  router.push('/settings')
}
</script>

<style lang="less" scoped>
.home-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #FFFFFF;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__bed-icon {
    font-size: 20px;
  }

  &__bed-number {
    font-size: 18px;
    font-weight: 600;
    color: #1890FF;
  }
}

.home-greeting {
  padding: 16px;
  padding-top: 8px;

  &__name {
    font-size: 22px;
    font-weight: 600;
    color: #333;
    margin: 0 0 4px;
  }

  &__date {
    font-size: 14px;
    color: #999;
    margin: 0;
  }
}

.home-actions {
  display: flex;
  gap: 12px;
  padding: 0 16px 16px;
}

.home-action-btn {
  flex: 1;
  height: 120px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:active {
    transform: scale(0.98);
  }

  &--intake {
    background: linear-gradient(135deg, #52C41A 0%, #73D13D 100%);
    color: #FFFFFF;
  }

  &--output {
    background: linear-gradient(135deg, #FA8C16 0%, #FFA940 100%);
    color: #FFFFFF;
  }

  &__icon {
    font-size: 32px;
  }

  &__text {
    font-size: 18px;
    font-weight: 600;
  }

  &__amount {
    font-size: 14px;
    opacity: 0.9;
  }
}

.home-summary {
  margin: 0 16px 12px;

  &__content {
    display: flex;
    align-items: center;
    padding: 0 16px 16px;
  }

  &__item {
    flex: 1;
    text-align: center;
  }

  &__label {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;

    &--intake {
      color: #52C41A;
    }

    &--output {
      color: #FA8C16;
    }

    &--balance {
      color: #1890FF;
    }
  }

  &__unit {
    font-size: 12px;
    font-weight: 400;
    margin-left: 2px;
  }

  &__divider {
    width: 1px;
    height: 40px;
    background: #F0F0F0;
  }
}

.home-recent {
  margin: 0 16px 16px;

  &__list {
    min-height: 100px;
  }
}

.home-voice-btn {
  margin: 0 16px 16px;
  height: 48px;
  font-size: 16px;
}
</style>
