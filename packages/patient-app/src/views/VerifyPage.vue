<template>
  <div class="verify-page">
    <!-- Header -->
    <div class="verify-header">
      <div class="verify-header__icon">🏥</div>
      <h1 class="verify-header__title">出入量记录</h1>
      <p class="verify-header__subtitle">24小时出入量记录系统</p>
    </div>

    <!-- Content -->
    <div class="verify-content">
      <!-- Loading State -->
      <van-loading v-if="loading" size="48px" vertical>正在验证...</van-loading>

      <!-- Error State - No bed number -->
      <template v-else-if="!bedNumber">
        <div class="verify-error">
          <div class="verify-error__icon">❓</div>
          <h2 class="verify-error__title">未找到床位信息</h2>
          <p class="verify-error__desc">请通过扫描床头二维码进入系统</p>
        </div>
      </template>

      <!-- Error State - No patient -->
      <template v-else-if="noPatient">
        <div class="verify-error">
          <div class="verify-error__icon">🛏️</div>
          <h2 class="verify-error__title">该床位暂无人入住</h2>
          <p class="verify-error__desc">床位号：{{ bedNumber }}</p>
        </div>
      </template>

      <!-- Success State - Patient found -->
      <template v-else-if="patientInfo">
        <div class="verify-card">
          <div class="verify-greeting">
            <div class="verify-greeting__avatar">👤</div>
            <h2 class="verify-greeting__text">您好，{{ patientInfo.name }}</h2>
            <p class="verify-greeting__hint">请确认是您本人</p>
          </div>

          <div class="verify-info">
            <van-cell-group :border="false">
              <van-cell title="床位号" :value="patientInfo.bedNumber" />
              <van-cell title="住院号" :value="patientInfo.hospitalNumber" />
            </van-cell-group>
          </div>

          <div class="verify-actions">
            <van-button
              type="primary"
              block
              size="large"
              :loading="confirming"
              loading-text="正在进入..."
              @click="handleConfirm"
            >
              是我，进入记录
            </van-button>
          </div>
        </div>
      </template>

      <!-- API Error State -->
      <template v-else-if="apiError">
        <div class="verify-error">
          <div class="verify-error__icon">⚠️</div>
          <h2 class="verify-error__title">验证失败</h2>
          <p class="verify-error__desc">{{ apiError }}</p>
          <van-button type="primary" size="small" @click="handleRetry">重试</van-button>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="verify-footer">
      <p>如有疑问请联系护士</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const confirming = ref(false)
const bedNumber = ref('')
const noPatient = ref(false)
const apiError = ref('')
const patientInfo = ref<{ name: string; bedNumber: string; hospitalNumber: string } | null>(null)

onMounted(() => {
  // Get bed number from query param
  const queryBed = route.query.bed as string
  if (queryBed) {
    bedNumber.value = queryBed
    fetchPatientInfo(queryBed)
  } else {
    // Try to get from URL hash or path (for QR code scanning)
    const urlParams = new URLSearchParams(window.location.search)
    const bedParam = urlParams.get('bed') || urlParams.get('bedNumber')
    if (bedParam) {
      bedNumber.value = bedParam
      fetchPatientInfo(bedParam)
    }
  }
})

async function fetchPatientInfo(bed: string) {
  loading.value = true
  apiError.value = ''
  noPatient.value = false

  try {
    const result = await authStore.verify(bed)
    if (result && authStore.patientInfo) {
      patientInfo.value = {
        name: authStore.patientInfo.name,
        bedNumber: authStore.patientInfo.bedNumber,
        hospitalNumber: authStore.patientInfo.hospitalNumber,
      }
    } else {
      noPatient.value = true
    }
  } catch (error: any) {
    console.error('Fetch patient failed:', error)
    if (error?.message?.includes('不存在') || error?.message?.includes('未找到')) {
      noPatient.value = true
    } else {
      apiError.value = error?.message || '验证失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

async function handleConfirm() {
  confirming.value = true

  try {
    // Redirect to home or original path
    const redirect = route.query.redirect as string
    await router.push(redirect || '/')
    showToast('验证成功')
  } catch (error) {
    console.error('Navigation failed:', error)
  } finally {
    confirming.value = false
  }
}

function handleRetry() {
  if (bedNumber.value) {
    fetchPatientInfo(bedNumber.value)
  }
}
</script>

<style lang="less" scoped>
.verify-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #E6F4FF 0%, #F0F5FF 100%);
  display: flex;
  flex-direction: column;
  padding: 0 20px;
}

.verify-header {
  text-align: center;
  padding-top: 60px;
  padding-bottom: 40px;

  &__icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  &__title {
    font-size: 28px;
    font-weight: 700;
    color: #1890FF;
    margin: 0 0 8px;
  }

  &__subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.verify-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verify-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.verify-greeting {
  text-align: center;
  margin-bottom: 24px;

  &__avatar {
    font-size: 48px;
    margin-bottom: 12px;
  }

  &__text {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px;
  }

  &__hint {
    font-size: 14px;
    color: #999;
    margin: 0;
  }
}

.verify-info {
  margin-bottom: 24px;
  background: #F8F9FA;
  border-radius: 12px;
  overflow: hidden;
}

.verify-actions {
  margin-top: 24px;

  .van-button {
    height: 56px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 600;
  }
}

.verify-error {
  text-align: center;
  padding: 40px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;

  &__icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 12px;
  }

  &__desc {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px;
  }
}

.verify-footer {
  text-align: center;
  padding: 24px 0 40px;

  p {
    font-size: 14px;
    color: #999;
    margin: 0;
  }
}
</style>
