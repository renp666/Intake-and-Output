<template>
  <n-card title="科室管理">
    <template #header-extra>
      <n-button type="primary" @click="showAddModal = true">
        添加科室
      </n-button>
    </template>

    <n-data-table
      :columns="columns"
      :data="departments"
      :loading="loading"
      :pagination="false"
      :row-key="(row: any) => row.id"
    />
  </n-card>

  <n-modal v-model:visible="showAddModal" title="添加科室" style="width: 500px">
    <n-form
      ref="addFormRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入科室名称" />
      </n-form-item>
      <n-form-item label="编码" path="code">
        <n-input v-model:value="formData.code" placeholder="请输入科室编码" />
      </n-form-item>
      <n-form-item label="状态" path="status">
        <n-select
          v-model:value="formData.status"
          :options="statusOptions"
          placeholder="请选择状态"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showAddModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:visible="showEditModal" title="编辑科室" style="width: 500px">
    <n-form
      ref="editFormRef"
      :model="editFormData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="editFormData.name" placeholder="请输入科室名称" />
      </n-form-item>
      <n-form-item label="编码" path="code">
        <n-input v-model:value="editFormData.code" placeholder="请输入科室编码" />
      </n-form-item>
      <n-form-item label="状态" path="status">
        <n-select
          v-model:value="editFormData.status"
          :options="statusOptions"
          placeholder="请选择状态"
        />
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
import { departmentsApi, type Department } from '@/api/modules/departments'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const departments = ref<Department[]>([])

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
]

const columns: DataTableColumns<Department> = [
  { title: '名称', key: 'name', width: 150 },
  { title: '编码', key: 'code', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      return h(NTag, {
        type: row.status === 'active' ? 'success' : 'default',
        size: 'small'
      }, { default: () => row.status === 'active' ? '启用' : '禁用' })
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
            default: () => '确定删除此科室？'
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
  code: '',
  status: 'active' as string
})

const editFormData = reactive({
  id: 0,
  name: '',
  code: '',
  status: 'active' as string
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入科室编码', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const loadData = async () => {
  loading.value = true
  try {
    departments.value = await departmentsApi.list()
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    await addFormRef.value?.validate()
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    await departmentsApi.create(formData)
    message.success('添加成功')
    showAddModal.value = false
    formData.name = ''
    formData.code = ''
    formData.status = 'active'
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const handleEdit = (dept: Department) => {
  editFormData.id = dept.id
  editFormData.name = dept.name
  editFormData.code = dept.code
  editFormData.status = dept.status
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
    await departmentsApi.update(editFormData.id, editFormData)
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
    await departmentsApi.delete(id)
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