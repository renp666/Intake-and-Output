import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getRecords, createRecord, updateRecord, deleteRecord, restoreRecord } from '@/api/modules/records'
import type { PatientRecord, PaginatedResponse } from '@/api/modules/patients'
import type { CreateRecordPayload, UpdateRecordPayload, RecordsQueryParams } from '@/api/modules/records'
import { useAuthStore } from './auth'
import { isSameDay, getTodayRange } from '@/utils/format'

export const useRecordsStore = defineStore('patient-records', () => {
  // State
  const records = ref<PatientRecord[]>([])
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const totalPages = ref(0)
  const hasMore = ref(true)

  // Computed
  const todayRecords = computed(() => {
    const today = new Date()
    return records.value.filter((r) => isSameDay(r.recordTime, today) && r.status !== 'deleted')
  })

  const todayIntakeTotal = computed(() => {
    return todayRecords.value
      .filter((r) => r.recordType === 'intake')
      .reduce((sum, r) => sum + r.amount, 0)
  })

  const todayOutputTotal = computed(() => {
    return todayRecords.value
      .filter((r) => r.recordType === 'output')
      .reduce((sum, r) => sum + r.amount, 0)
  })

  const todayBalance = computed(() => {
    return todayIntakeTotal.value - todayOutputTotal.value
  })

  const recentRecords = computed(() => {
    return [...records.value]
      .filter((r) => r.status !== 'deleted')
      .sort((a, b) => new Date(b.recordTime).getTime() - new Date(a.recordTime).getTime())
      .slice(0, 3)
  })

  // Fetch records with pagination
  async function fetchRecords(params?: RecordsQueryParams, reset = false) {
    const authStore = useAuthStore()
    if (!authStore.patientId) return

    if (reset) {
      page.value = 1
      records.value = []
      hasMore.value = true
    }

    if (!hasMore.value) return

    loading.value = true
    try {
      const response = await getRecords({
        patientId: authStore.patientId,
        page: page.value,
        pageSize: pageSize.value,
        ...params,
      })

      if (response) {
        const data = response as unknown as PaginatedResponse<PatientRecord>
        if (reset) {
          records.value = data.items || []
        } else {
          records.value.push(...(data.items || []))
        }
        total.value = data.total || 0
        totalPages.value = data.totalPages || 0
        hasMore.value = page.value < totalPages.value
        page.value++
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      loading.value = false
    }
  }

  // Create a new record
  async function addRecord(data: CreateRecordPayload): Promise<PatientRecord | null> {
    try {
      const newRecord = await createRecord(data)
      if (newRecord) {
        records.value.unshift(newRecord)
        return newRecord
      }
      return null
    } catch (error) {
      console.error('Failed to create record:', error)
      return null
    }
  }

  // Update a record
  async function editRecord(
    recordId: string,
    data: UpdateRecordPayload
  ): Promise<PatientRecord | null> {
    try {
      const updated = await updateRecord(recordId, data)
      if (updated) {
        const index = records.value.findIndex((r) => r.id === recordId)
        if (index !== -1) {
          records.value[index] = updated
        }
        return updated
      }
      return null
    } catch (error) {
      console.error('Failed to update record:', error)
      return null
    }
  }

  // Delete a record
  async function removeRecord(recordId: string): Promise<boolean> {
    try {
      await deleteRecord(recordId)
      const index = records.value.findIndex((r) => r.id === recordId)
      if (index !== -1) {
        records.value[index].status = 'deleted'
      }
      return true
    } catch (error) {
      console.error('Failed to delete record:', error)
      return false
    }
  }

  // Restore a record
  async function restoreDeletedRecord(recordId: string): Promise<boolean> {
    try {
      const restored = await restoreRecord(recordId)
      if (restored) {
        const index = records.value.findIndex((r) => r.id === recordId)
        if (index !== -1) {
          records.value[index] = restored
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to restore record:', error)
      return false
    }
  }

  // Load more records
  async function loadMore(params?: RecordsQueryParams) {
    await fetchRecords(params, false)
  }

  // Refresh records
  async function refresh(params?: RecordsQueryParams) {
    await fetchRecords(params, true)
  }

  // Get today's summary for statistics
  function getTodaySummary() {
    return {
      intakeTotal: todayIntakeTotal.value,
      outputTotal: todayOutputTotal.value,
      balance: todayBalance.value,
    }
  }

  return {
    // State
    records,
    loading,
    page,
    pageSize,
    total,
    totalPages,
    hasMore,

    // Computed
    todayRecords,
    todayIntakeTotal,
    todayOutputTotal,
    todayBalance,
    recentRecords,

    // Actions
    fetchRecords,
    addRecord,
    editRecord,
    removeRecord,
    restoreDeletedRecord,
    loadMore,
    refresh,
    getTodaySummary,
  }
})
