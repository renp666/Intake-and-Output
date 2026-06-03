<template>
  <div class="page-container">
    <div class="voice-page">
      <!-- Header -->
      <div class="voice-header">
        <h2 class="voice-header__title">语音录入</h2>
        <p class="voice-header__hint">点击麦克风按钮，说出您的出入量记录</p>
      </div>

      <!-- Microphone Button -->
      <div class="voice-mic">
        <div
          :class="['voice-mic__btn', { 'voice-mic__btn--recording': isRecording }]"
          @click="toggleRecording"
        >
          <van-icon :name="isRecording ? 'stop' : 'chat-o'" size="48" color="#FFFFFF" />
        </div>
        <div v-if="isRecording" class="voice-mic__pulse"></div>
        <div v-if="isRecording" class="voice-mic__pulse voice-mic__pulse--delay"></div>
      </div>

      <!-- Recording Status -->
      <div class="voice-status">
        <template v-if="!isSupported">
          <div class="voice-status__icon">⚠️</div>
          <div class="voice-status__text">您的浏览器不支持语音识别</div>
        </template>
        <template v-else-if="permissionDenied">
          <div class="voice-status__icon">🔇</div>
          <div class="voice-status__text">麦克风权限被拒绝</div>
          <van-button size="small" type="primary" @click="requestPermission">重新授权</van-button>
        </template>
        <template v-else-if="networkError">
          <div class="voice-status__icon">📶</div>
          <div class="voice-status__text">网络连接失败</div>
          <van-button size="small" type="primary" @click="resetState">重试</van-button>
        </template>
        <template v-else-if="isRecording">
          <div class="voice-status__text">正在聆听...</div>
        </template>
        <template v-else>
          <div class="voice-status__text">点击上方按钮开始语音输入</div>
        </template>
      </div>

      <!-- Recognition Result -->
      <div v-if="recognitionResult" class="voice-result card">
        <div class="voice-result__header">
          <span>识别结果</span>
          <van-icon name="edit" size="16" color="#999" />
        </div>
        <div class="voice-result__content">
          <p>{{ recognitionResult }}</p>
        </div>
        <div class="voice-result__actions">
          <van-button size="small" @click="handleRetry">重新识别</van-button>
          <van-button size="small" type="primary" @click="handleConfirm">确认</van-button>
        </div>
      </div>

      <!-- Examples -->
      <div class="voice-examples card">
        <div class="section-title">
          <span>示例</span>
        </div>
        <div class="voice-examples__list">
          <div class="voice-examples__item" @click="setExample('饮水200毫升')">
            "饮水200毫升"
          </div>
          <div class="voice-examples__item" @click="setExample('尿量300ml')">
            "尿量300ml"
          </div>
          <div class="voice-examples__item" @click="setExample('喝了一杯牛奶')">
            "喝了一杯牛奶"
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'

const router = useRouter()

// Speech Recognition
const isSupported = ref(false)
const isRecording = ref(false)
const permissionDenied = ref(false)
const networkError = ref(false)
const recognitionResult = ref('')

let recognition: any = null

onMounted(() => {
  // Check browser support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  isSupported.value = !!SpeechRecognition

  if (isSupported.value) {
    recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      recognitionResult.value = finalTranscript || interimTranscript
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      isRecording.value = false

      switch (event.error) {
        case 'not-allowed':
          permissionDenied.value = true
          break
        case 'network':
          networkError.value = true
          break
        case 'no-speech':
          showToast('未检测到语音，请重试')
          break
        default:
          showToast('语音识别失败，请重试')
      }
    }

    recognition.onend = () => {
      isRecording.value = false
    }
  }
})

onUnmounted(() => {
  if (recognition) {
    recognition.abort()
  }
})

function toggleRecording() {
  if (!isSupported.value) {
    showDialog({
      title: '提示',
      message: '您的浏览器不支持语音识别功能，请使用Chrome浏览器',
    })
    return
  }

  if (permissionDenied.value) {
    requestPermission()
    return
  }

  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  try {
    recognitionResult.value = ''
    networkError.value = false
    recognition.start()
    isRecording.value = true
  } catch (error) {
    console.error('Start recording failed:', error)
    showToast('启动语音识别失败')
  }
}

function stopRecording() {
  try {
    recognition.stop()
    isRecording.value = false
  } catch (error) {
    console.error('Stop recording failed:', error)
  }
}

function requestPermission() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(() => {
      permissionDenied.value = false
      showToast('权限已授权')
    })
    .catch(() => {
      showToast('麦克风权限被拒绝')
    })
}

function resetState() {
  permissionDenied.value = false
  networkError.value = false
  recognitionResult.value = ''
}

function handleRetry() {
  recognitionResult.value = ''
  startRecording()
}

function handleConfirm() {
  if (recognitionResult.value) {
    // In a real app, this would parse the result and create a record
    showToast('已提交识别结果')
    // Navigate back or to records
    router.push('/records')
  }
}

function setExample(text: string) {
  recognitionResult.value = text
}
</script>

<style lang="less" scoped>
.voice-page {
  padding: 24px 16px;
  text-align: center;
}

.voice-header {
  margin-bottom: 40px;

  &__title {
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

.voice-mic {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40px;

  &__btn {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1890FF 0%, #40A9FF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    z-index: 1;

    &:active {
      transform: scale(0.95);
    }

    &--recording {
      background: linear-gradient(135deg, #FF4D4F 0%, #FF7875 100%);
    }
  }

  &__pulse {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255, 77, 79, 0.3);
    animation: pulse 2s infinite;

    &--delay {
      animation-delay: 0.5s;
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.voice-status {
  margin-bottom: 32px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &__icon {
    font-size: 32px;
  }

  &__text {
    font-size: 16px;
    color: #666;
  }
}

.voice-result {
  text-align: left;
  margin-bottom: 24px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #F0F0F0;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  &__content {
    padding: 16px;

    p {
      font-size: 18px;
      color: #333;
      margin: 0;
      line-height: 1.6;
    }
  }

  &__actions {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid #F0F0F0;

    .van-button {
      flex: 1;
    }
  }
}

.voice-examples {
  text-align: left;

  &__list {
    padding: 0 16px 16px;
  }

  &__item {
    padding: 12px 16px;
    background: #F8F9FA;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;

    &:last-child {
      margin-bottom: 0;
    }

    &:active {
      background: #E6F4FF;
    }
  }
}
</style>
