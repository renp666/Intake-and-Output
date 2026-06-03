<template>
  <n-card title="班次配置">
    <template #header-extra>
      <n-button type="primary" @click="showAddModal = true">
        添加班次
      </n-button>
    </template>

    <n-data-table
      :columns="columns"
      :data="shifts"
      :loading="loading"
      :pagination="false"
      :row-key="(row: any) => row.id"
    />
  </n-card>

  <n-modal v-model:visible="showAddModal" title="添加班次" style="width: 500px">
    <n-form
      ref="addFormRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入班次名称" />
      </n-form-item>
      <n-form-item label="开始时间" path="startTime">
        <n-time-picker v-model:value="formData.startTime" format="HH:mm" style="width: 100%" />
      </n-form-item>
      <n-form-item label="结束时间" path="endTime">
        <n-time-picker v-model:value="formData.endTime" format="HH:mm" style="width: 100%" />
      </n-form-item>
      <n-form-item label="默认班次">
        <n-switch v-model:value="formData.isDefault" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showAddModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:visible="showEditModal" title="编辑班次" style="width: 500px">
    <n-form
      ref="editFormRef"
      :model="editFormData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="editFormData.name" placeholder="请输入班次名称" />
      </n-form-item>
      <n-form-item label="开始时间" path="startTime">
        <n-time-picker v-model:value="editFormData.startTime" format="HH:mm" style="width: 100%" />
      </n-form-item>
      <n-form-item label="结束时间" path="endTime">
        <n-time-picker v-model:value="editFormData.endTime" format="HH:mm" style="width: 100%" />
      </n-form-item>
      <n-form-item label="默认班次">
        <n-switch v-model:value="editFormData.isDefault" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleEditSubmit">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NTag, NSpace, NPopconfirm, type FormInst, type FormRules } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { configApi, type Shift } from '@/api/modules/config'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const shifts = ref<Shift[]>([])

const columns: DataTableColumns<Shift> = [
  { title: '名称', key: 'name', width: 120 },
  {
    title: '开始时间',
    key: 'startTime',
    width: 100,
    render: (row) => row.startTime
  },
  {
    title: '结束时间',
    key: 'endTime',
    width: 100,
    render: (row) => row.endTime
  },
  {
    title: '默认',
    key: 'isDefault',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.isDefault ? 'success' : 'default',
        size: 'small'
      }, { default: () => row.isDefault ? '是' : '否' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => handleEdit(row)
          }, { default: () => '编辑' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
            default: () => '确定删除此班次？'
          })
        ]
      })
    }
  }
]

const showAddModal = ref(false)
const showEditModal = ref(false)
const addFormRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)

const formData = reactive({
  name: '',
  startTime: null as number | null,
  endTime: null as number | null,
  isDefault: false
})

const editFormData = reactive({
  id: 0,
  name: '',
  startTime: null as number | null,
  endTime: null as number | null,
  isDefault: false
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入班次名称', trigger: 'blur' }],
  startTime: [{ required: true, type: 'number', message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, type: 'number', message: '请选择结束时间', trigger: 'change' }]
}

const loadData = async () => {
  loading.value = true
  try {
    shifts.value = await configApi.getShifts()
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (timestamp: number | null) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleSubmit = async () => {
  try {
    await addFormRef.value?.validate()
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    await configApi.createShift({
      name: formData.name,
      startTime: formatTime(formData.startTime),
      endTime: formatTime(formData.endTime),
      isDefault: formData.isDefault
    })
    message.success('添加成功')
    showAddModal.value = false
    formData.name = ''
    formData.startTime = null
    formData.endTime = null
    formData.isDefault = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const handleEdit = (shift: Shift) => {
  editFormData.id = shift.id
  editFormData.name = shift.name
  editFormData.isDefault = shift.isDefault

  // Parse time strings to timestamps
  const [startHour, startMin] = shift.startTime.split(':').map(Number)
  const [endHour, endMin] = shift.endTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(startHour, startMin, 0, 0)
  const endDate = new Date()
  endDate.setHours(endHour, endMin, 0, 0)
  editFormData.startTime = startDate.getTime()
  editFormData.endTime = endDate.getTime()

  showEditModal.value = true
}

const handleEditSubmit = async () => {
  try {
    await editFormRef.value?.validate()
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    await configApi.updateShift(editFormData.id, {
      name: editFormData.name,
      startTime: formatTime(editFormData.startTime),
      endTime: formatTime(editFormData.endTime),
      isDefault: editFormData.isDefault
    })
    message.success('更新成功')
    showEditModal.value = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await configApi.deleteShift(id)
    message.success('删除成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  loadData()
})
</script>