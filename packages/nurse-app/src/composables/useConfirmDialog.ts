import { ref } from 'vue'

const LAST_OPERATOR_KEY = 'lastOperatorName'

export function useConfirmDialog() {
  const visible = ref(false)
  const title = ref('确认操作')
  const content = ref('请输入操作人姓名')
  const operatorName = ref('')
  let resolvePromise: ((value: string) => void) | null = null
  let rejectPromise: ((reason?: any) => void) | null = null

  const init = () => {
    const savedName = localStorage.getItem(LAST_OPERATOR_KEY)
    if (savedName) {
      operatorName.value = savedName
    }
  }

  init()

  const open = (options?: { title?: string; content?: string }): Promise<string> => {
    if (options?.title) {
      title.value = options.title
    }
    if (options?.content) {
      content.value = options.content
    }

    const savedName = localStorage.getItem(LAST_OPERATOR_KEY)
    if (savedName) {
      operatorName.value = savedName
    }

    visible.value = true

    return new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })
  }

  const handleConfirm = () => {
    if (!operatorName.value.trim()) {
      return
    }

    localStorage.setItem(LAST_OPERATOR_KEY, operatorName.value.trim())
    visible.value = false

    if (resolvePromise) {
      resolvePromise(operatorName.value.trim())
      resolvePromise = null
      rejectPromise = null
    }
  }

  const handleCancel = () => {
    visible.value = false

    if (rejectPromise) {
      rejectPromise(new Error('用户取消操作'))
      resolvePromise = null
      rejectPromise = null
    }
  }

  return {
    visible,
    title,
    content,
    operatorName,
    open,
    handleConfirm,
    handleCancel
  }
}