import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPatientByBed } from '@/api/modules/auth'
import type { PatientInfo } from '@/api/modules/auth'
import { getDeviceId } from '@/utils/device'

export const useAuthStore = defineStore('patient-auth', () => {
  // State
  const patientInfo = ref<PatientInfo | null>(null)
  const isVerified = ref(false)
  const token = ref<string>('')

  // Computed
  const bedNumber = computed(() => patientInfo.value?.bedNumber || '')
  const patientName = computed(() => patientInfo.value?.name || '')
  const patientId = computed(() => patientInfo.value?.id || '')

  // Initialize from sessionStorage
  function initFromStorage() {
    try {
      const storedInfo = sessionStorage.getItem('patient_info')
      const storedToken = sessionStorage.getItem('patient_token')

      if (storedInfo) {
        patientInfo.value = JSON.parse(storedInfo)
        isVerified.value = true
      }
      if (storedToken) {
        token.value = storedToken
      }
    } catch (error) {
      console.error('Failed to restore auth state:', error)
      clearStorage()
    }
  }

  // Clear storage
  function clearStorage() {
    sessionStorage.removeItem('patient_info')
    sessionStorage.removeItem('patient_token')
  }

  // Verify patient identity by bed number
  async function verify(bedNumber: string): Promise<boolean> {
    try {
      const patient = await getPatientByBed(bedNumber)
      if (patient) {
        patientInfo.value = patient
        isVerified.value = true
        token.value = `bed-${bedNumber}-${getDeviceId()}`

        // Persist to sessionStorage
        sessionStorage.setItem('patient_info', JSON.stringify(patient))
        sessionStorage.setItem('patient_token', token.value)

        return true
      }
      return false
    } catch (error) {
      console.error('Verification failed:', error)
      return false
    }
  }

  // Logout
  function logout() {
    patientInfo.value = null
    isVerified.value = false
    token.value = ''
    clearStorage()
  }

  // Check if authenticated
  function checkAuth(): boolean {
    return isVerified.value && !!patientInfo.value
  }

  // Initialize
  initFromStorage()

  return {
    // State
    patientInfo,
    isVerified,
    token,

    // Computed
    bedNumber,
    patientName,
    patientId,

    // Actions
    verify,
    logout,
    checkAuth,
    initFromStorage,
  }
})
