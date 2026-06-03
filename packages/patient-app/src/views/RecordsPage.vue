<template>
  <div class="page-container">
    <!-- Filter -->
    <div class="records-filter">
      <van-dropdown-menu active-color="#1890FF">
        <van-dropdown-item v-model="filterType" :options="typeOptions" />
        <van-dropdown-item v-model="filterStatus" :options="statusOptions" />
      </van-dropdown-menu>
    </div>

    <!-- Records List -->
    <div class="records-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loadingMore"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoadMore"
        >
          <!-- Grouped by date -->
          <template v-for="(group, date) in groupedRecords" :key="date">
            <div class="records-date">
              <div class="records-date__label">{{ formatDateLabel(date as string) }}</div>
            </div>

            <div class="records-list card">
              <div
                v-for="record in group"
                :key="record.id"
                :class="['record-item', { 'record-item--deleted': record.status === 'deleted' }]"
              >
                <div :class="['record-item__icon', `record-item__icon--${record.recordType}`]">
                  {{ getRecordEmoji(record.projectCode, record.recordType) }}
                </div>
                <div class="record-item__info">
                  <div class="record-item__name">{{ record.projectName }}</div>
                  <div class="record-item__meta">
                    {{ formatTime(record.recordTime) }}
                    <span
                      :class="['status-badge', `status-badge--${record.status}`]"
                    >
                      {{ statusText[record.status] }}
                    </span>
                  </div>
                </div>
                <div class="record-item__right">
                  <div :class="['record-item__amount', `record-item__amount--${record.recordType}`]">
                    {{ record.recordType === 'intake' ? '+' : '-' }}{{ record.amount }}{{ record.unit }}
                  </div>
                  <!-- Actions for pending records -->
                  <div v-if="record.status === 'pending'" class="record-item__actions">
                    <van-icon name="edit" size="16" color="#1890FF" @click.stop="handleEdit(record)" />
                    <van-icon name="delete-o" size="16" color="#FF4D4F" @click.stop="handleDelete(record)" />
                  </div>
                  <!-- Restore button for deleted records -->
                  <div v-if="record.status === 'deleted'" class="record-item__actions">
                    <van-icon name="replay" size="16" color="#52C41A" @click.stop="handleRestore(record)" />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Empty State -->
          <div v-if="!loading && records.length === 0" class="empty-state">
            <div class="empty-state__icon">📝</div>
            <div class="empty-state__text">暂无记录</div>
            <van-button type="primary" size="small" @click="goToRecord">去记录</van-button>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useRecordsStore } from '@/stores/records'
import { formatTime, formatDate, groupByDate } from '@/utils/format'
import type { PatientRecord } from '@/api/modules/patients'

const router = useRouter()
const recordsStore = useRecordsStore()

// Filter state
const filterType = ref('all')
const filterStatus = ref('all')
const refreshing = ref(false)
const loadingMore = ref(false)

const typeOptions = [
  { text: '全部类型', value: 'all' },
  { text: '入量', value: 'intake' },
  { text: '出量', value: 'output' },
]

const statusOptions = [
  { text: '全部状态', value: 'all' },
  { text: '待确认', value: 'pending' },
  { text: '已确认', value: 'confirmed' },
  { text: '已删除', value: 'deleted' },
]

const statusText: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  deleted: '已删除',
}

// Computed
const records = computed(() => {
  let filtered = recordsStore.records

  if (filterType.value !== 'all') {
    filtered = filtered.filter((r) => r.recordType === filterType.value)
  }

  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((r) => r.status === filterStatus.value)
  }

  return filtered
})

const groupedRecords = computed(() => {
  return groupByDate(records.value)
})

const loading = computed(() => recordsStore.loading)
const finished = computed(() => !recordsStore.hasMore)

onMounted(() => {
  // Initial fetch
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

function formatDateLabel(dateStr: string): string {
  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))

  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'

  const date = new Date(dateStr)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekDays[date.getDay()]}`
}

async function onRefresh() {
  await recordsStore.refresh()
  refreshing.value = false
}

async function onLoadMore() {
  loadingMore.value = true
  await recordsStore.loadMore()
  loadingMore.value = false
}

function handleEdit(record: PatientRecord) {
  router.push(`/records/${record.id}/edit`)
}

async function handleDelete(record: PatientRecord) {
  try {
    await showDialog({
      title: '确认删除',
      message: '确定要删除这条记录吗？',
      showCancelButton: true,
    })

    const success = await recordsStore.removeRecord(record.id)
    if (success) {
      showToast('已删除')
    }
  } catch {
    // User cancelled
  }
}

async function handleRestore(record: PatientRecord) {
  const success = await recordsStore.restoreDeletedRecord(record.id)
  if (success) {
    showToast('已恢复')
  }
}

function goToRecord() {
  router.push('/record/intake')
}
</script>

<style lang="less" scoped>
.records-filter {
  background: #FFFFFF;
  position: sticky;
  top: 0;
  z-index: 10;
}

.records-content {
  padding: 12px 16px;
  padding-bottom: 80px;
}

.records-date {
  padding: 16px 0 8px;

  &__label {
    font-size: 14px;
    font-weight: 500;
    color: #666;
  }
}

.records-list {
  margin-bottom: 12px;
}

.record-item {
  &--deleted {
    opacity: 0.6;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  &__actions {
    display: flex;
    gap: 12px;
  }
}
</style>
