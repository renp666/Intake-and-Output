<template>
  <n-card title="预设项目管理">
    <template #header-extra>
      <n-button type="primary" @click="showAddModal = true">
        添加项目
      </n-button>
    </template>

    <n-space style="margin-bottom: 16px">
      <n-select
        v-model:value="filters.type"
        :options="typeOptions"
        placeholder="类型"
        clearable
        style="width: 120px"
      />
      <n-select
        v-model:value="filters.permission"
        :options="permissionOptions"
        placeholder="权限"
        clearable
        style="width: 120px"
      />
      <n-input
        v-model:value="filters.keyword"
        placeholder="搜索名称"
        clearable
        style="width: 180px"
        @clear="loadData"
        @keyup.enter="loadData"
      />
      <n-button type="primary" @click="loadData">查询</n-button>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="items"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row: any) => row.id"
      remote
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </n-card>

  <n-modal v-model:visible="showAddModal" title="添加预设项目" style="width: 500px">
    <n-form
      ref="addFormRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入项目名称" />
      </n-form-item>
      <n-form-item label="类型" path="type">
        <n-select
          v-model:value="formData.type"
          :options="typeOptions"
          placeholder="请选择类型"
        />
      </n-form-item>
      <n-form-item label="单位" path="unit">
        <n-input v-model:value="formData.unit" placeholder="请输入单位，如 ml、g" />
      </n-form-item>
      <n-form-item label="权限" path="permission">
        <n-select
          v-model:value="formData.permission"
          :options="permissionOptions"
          placeholder="请选择权限"
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

  <n-modal v-model:visible="showEditModal" title="编辑预设项目" style="width: 500px">
    <n-form
      ref="editFormRef"
      :model="editFormData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input v-model:value="editFormData.name" placeholder="请输入项目名称" />
      </n-form-item>
      <n-form-item label="类型" path="type">
        <n-select
          v-model:value="editFormData.type"
          :options="typeOptions"
          placeholder="请选择类型"
        />
      </n-form-item>
      <n-form-item label="单位" path="unit">
        <n-input v-model:value="editFormData.unit" placeholder="请输入单位" />
      </n-form-item>
      <n-form-item label="权限" path="permission">
        <n-select
          v-model:value="editFormData.permission"
          :options="permissionOptions"
          placeholder="请选择权限"
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
import { useMessage, NButton, NTag, NSpace, NPopconfirm, NSwitch, type FormInst, type FormRules } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { presetItemsApi, type PresetItem } from '@/api/modules/presetItems'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const items = ref<PresetItem[]>([])

const filters = reactive({
  type: null as string | null,
  permission: null as string | null,
  keyword: ''
})

const typeOptions = [
  { label: '入量', value: 'intake' },
  { label: '出量', value: 'output' }
]

const permissionOptions = [
  { label: '管理员', value: 'admin' },
  { label: '护士', value: 'nurse' },
  { label: '患者', value: 'patient' }
]

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: (info: any) => `共 ${info?.itemCount ?? 0} 条`
})

const columns: DataTableColumns<PresetItem> = [
  { title: '名称', key: 'name', width: 120 },
  {
    title: '类型',
    key: 'type',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.type === 'intake' ? 'success' : 'warning',
        size: 'small'
      }, { default: () => row.type === 'intake' ? '入量' : '出量' })
    }
  },
  { title: '单位', key: 'unit', width: 60 },
  {
    title: '权限',
    key: 'permission',
    width: 80,
    render: (row) => {
      const permMap: Record<string, { type: string; label: string }> = {
        admin: { type: 'warning', label: '管理员' },
        nurse: { type: 'info', label: '护士' },
        patient: { type: 'default', label: '患者' }
      }
      const perm = permMap[row.permission] || { type: 'default', label: row.permission }
      return h(NTag, { type: perm.type as any, size: 'small' }, { default: () => perm.label })
    }
  },
  {
    title: '系统预设',
    key: 'isSystem',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.isSystem ? 'info' : 'default',
        size: 'small'
      }, { default: () => row.isSystem ? '是' : '否' })
    }
  },
  {
    title: '状态',
    key: 'isActive',
    width: 80,
    render: (row) => {
      return h(NSwitch, {
        value: row.isActive,
        onUpdateValue: () => handleToggle(row.id)
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => {
      const buttons = [
        h(NButton, {
          size: 'small',
          onClick: () => handleEdit(row)
        }, { default: () => '编辑' })
      ]

      if (!row.isSystem) {
        buttons.push(
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
            default: () => '确定删除此项目？'
          })
        )
      }

      return h(NSpace, { size: 'small' }, { default: () => buttons })
    }
  }
]

const showAddModal = ref(false)
const showEditModal = ref(false)
const addFormRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)

const formData = reactive({
  name: '',
  type: null as string | null,
  unit: '',
  permission: null as string | null
})

const editFormData = reactive({
  id: 0,
  name: '',
  type: null as string | null,
  unit: '',
  permission: null as string | null
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  permission: [{ required: true, message: '请选择权限', trigger: 'change' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await presetItemsApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type as any || undefined,
      permission: filters.permission as any || undefined,
      keyword: filters.keyword || undefined
    })
    items.value = res.items || []
    pagination.itemCount = res.total || 0
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadData()
}

const handleSubmit = async () => {
  try {
    await addFormRef.value?.validate()
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    await presetItemsApi.create(formData as any)
    message.success('添加成功')
    showAddModal.value = false
    formData.name = ''
    formData.type = null
    formData.unit = ''
    formData.permission = null
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const handleEdit = (item: PresetItem) => {
  editFormData.id = item.id
  editFormData.name = item.name
  editFormData.type = item.type
  editFormData.unit = item.unit
  editFormData.permission = item.permission
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
    await presetItemsApi.update(editFormData.id, editFormData as any)
    message.success('更新成功')
    showEditModal.value = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

const handleToggle = async (id: number) => {
  try {
    await presetItemsApi.toggle(id)
    message.success('操作成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await presetItemsApi.delete(id)
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