<template>
  <div class="page-container">
    <!-- Mode Settings -->
    <div class="settings-section">
      <div class="section-title">
        <span>界面模式</span>
      </div>
      <van-radio-group v-model="interfaceMode" class="settings-mode">
        <van-cell-group :border="false">
          <van-cell title="极简模式" label="大按钮、大字体，适合老年患者" clickable @click="interfaceMode = 'simple'">
            <template #right-icon>
              <van-radio name="simple" />
            </template>
          </van-cell>
          <van-cell title="标准模式" label="完整功能，适合熟练使用" clickable @click="interfaceMode = 'standard'">
            <template #right-icon>
              <van-radio name="standard" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
    </div>

    <!-- Quick Actions -->
    <div class="settings-section">
      <div class="section-title">
        <span>快捷操作</span>
      </div>
      <van-cell-group :border="false">
        <van-cell
          title="查看统计"
          is-link
          icon="chart-trending-o"
          @click="goToStatistics"
        />
        <van-cell
          title="语音录入"
          is-link
          icon="chat-o"
          @click="goToVoice"
        />
      </van-cell-group>
    </div>

    <!-- Support -->
    <div class="settings-section">
      <div class="section-title">
        <span>帮助与支持</span>
      </div>
      <van-cell-group :border="false">
        <van-cell
          title="联系护士"
          is-link
          icon="service-o"
          @click="contactNurse"
        />
        <van-cell
          title="使用说明"
          is-link
          icon="description"
          @click="showHelp"
        />
      </van-cell-group>
    </div>

    <!-- About -->
    <div class="settings-section">
      <div class="section-title">
        <span>关于</span>
      </div>
      <van-cell-group :border="false">
        <van-cell title="版本号" :value="version" />
        <van-cell title="系统名称" value="24小时出入量记录系统" />
      </van-cell-group>
    </div>

    <!-- Logout -->
    <div class="settings-logout">
      <van-button block plain type="danger" @click="handleLogout">
        退出登录
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const version = '1.0.0'
const interfaceMode = ref(localStorage.getItem('interface_mode') || 'simple')

// Persist mode change
watch(interfaceMode, (val) => {
  localStorage.setItem('interface_mode', val)
  showToast(`已切换为${val === 'simple' ? '极简' : '标准'}模式`)
})

function goToStatistics() {
  router.push('/statistics')
}

function goToVoice() {
  router.push('/voice')
}

function contactNurse() {
  showDialog({
    title: '联系护士',
    message: '如需帮助，请按床头呼叫按钮或直接前往护士站。',
    confirmButtonText: '我知道了',
  })
}

function showHelp() {
  showDialog({
    title: '使用说明',
    message: '1. 扫描床头二维码进入系统\n2. 点击"入量"或"出量"按钮记录\n3. 也可以使用语音输入\n4. 所有记录可在"记录"页面查看',
    confirmButtonText: '我知道了',
  })
}

async function handleLogout() {
  try {
    await showDialog({
      title: '确认退出',
      message: '退出后需要重新扫码验证',
      showCancelButton: true,
    })

    authStore.logout()
    router.push('/verify')
    showToast('已退出登录')
  } catch {
    // User cancelled
  }
}
</script>

<style lang="less" scoped>
.settings-section {
  margin-bottom: 12px;
  background: #FFFFFF;
}

.settings-mode {
  padding: 0 16px;
}

.settings-logout {
  padding: 32px 16px;
}
</style>
