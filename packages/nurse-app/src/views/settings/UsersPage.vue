<template>
  <n-card title="用户管理">
    <template #header-extra>
      <n-button type="primary" @click="showAddModal = true">
        添加用户
      </n-button>
    </template>

    <n-space style="margin-bottom: 16px">
      <n-input
        v-model:value="filters.keyword"
        placeholder="搜索用户名/姓名"
        clearable
        style="width: 200px"
        @clear="loadData"
        @keyup.enter="loadData"
      />
      <n-select
        v-model:value="filters.role"
        :options="roleOptions"
        placeholder="角色"
        clearable
        style="width: 120px"
      />
      <n-select
        v-model:value="filters.departmentId"
        :options="departmentOptions"
        placeholder="科室"
        clearable
        style="width: 150px"
      />
      <n-button type="primary" @click="loadData">查询</n-button>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="users"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row: any) => row.id"
      remote
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </n-card>

  <n-modal v-model:visible="showAddModal" title="添加用户" style="width: 500px">
    <n-form
      ref="addFormRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="formData.username" placeholder="请输入用户名" />
      </n-form-item>
      <n-form-item label="姓名" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入姓名" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" show-password-on="click" />
      </n-form-item>
      <n-form-item label="角色" path="role">
        <n-select
          v-model:value="formData.role"
          :options="roleOptions"
          placeholder="请选择角色"
        />
      </n-form-item>
      <n-form-item label="科室" path="departmentId">
        <n-select
          v-model:value="formData.departmentId"
          :options="departmentOptions"
          placeholder="请选择科室"
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

  <n-modal v-model:visible="showResetModal" title="重置密码" style="width: 400px">
    <n-form
      ref="resetFormRef"
      :model="resetFormData"
      :rules="resetFormRules"
      label-placement="left"
      label-width="80"
    >
      <n-form-item label="新密码" path="newPassword">
        <n-input v-model:value="resetFormData.newPassword" type="password" placeholder="请输入新密码" show-password-on="click" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showResetModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleResetSubmit">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NTag, NSpace, NPopconfirm, type FormInst, type FormRules } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { usersApi, type User } from '@/api/modules/users'
import { departmentsApi, type Department } from '@/api/modules/departments'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const users = ref<User[]>([])
const departments = ref<Department[]>([])

const filters = reactive({
  keyword: '',
  role: null as string | null,
  departmentId: null as number | null
})

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '护士', value: 'nurse' }
]

const departmentOptions = ref<Array<{ label: string; value: number }>>([])

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 条`
})

const columns: DataTableColumns<User> = [
  { title: '用户名', key: 'username', width: 120 },
  { title: '姓名', key: 'name', width: 100 },
  { title: '科室', key: 'departmentName', width: 120 },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render: (row) => {
      return h(NTag, {
        type: row.role === 'admin' ? 'warning' : 'info',
        size: 'small'
      }, { default: () => row.role === 'admin' ? '管理员' : '护士' })
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.status === 'active' ? 'success' : 'default',
        size: 'small'
      }, { default: () => row.status === 'active' ? '启用' : '禁用' })
    }
  },
  {
    title: '最后登录',
    key: 'lastLoginAt',
    width: 150,
    render: (row) => row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString('zh-CN') : '-'
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
    fixed: 'right',
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => handleToggleStatus(row)
          }, { default: () => row.status === 'active' ? '禁用' : '启用' }),
          h(NButton, {
            size: 'small',
            onClick: () => handleResetPassword(row)
          }, { default: () => '重置密码' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
            default: () => '确定删除此用户？'
          })
        ]
      })
    }
  }
]

const showAddModal = ref(false)
const showResetModal = ref(false)
const addFormRef = ref<FormInst | null>(null)
const resetFormRef = ref<FormInst | null>(null)
const currentUser = ref<User | null>(null)

const formData = reactive({
  username: '',
  name: '',
  password: '',
  role: null as string | null,
  departmentId: null as number | null
})

const resetFormData = reactive({
  newPassword: ''
})

const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  departmentId: [{ required: true, type: 'number', message: '请选择科室', trigger: 'change' }]
}

const resetFormRules: FormRules = {
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await usersApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      role: filters.role as any || undefined,
      departmentId: filters.departmentId || undefined
    })
    users.value = res.items || []
    pagination.itemCount = res.total || 0
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  try {
    departments.value = await departmentsApi.list()
    departmentOptions.value = departments.value.map(d => ({
      label: d.name,
      value: d.id
    }))
  } catch (error) {
    // ignore
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
    await usersApi.create(formData as any)
    message.success('添加成功')
    showAddModal.value = false
    formData.username = ''
    formData.name = ''
    formData.password = ''
    formData.role = null
    formData.departmentId = null
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const handleToggleStatus = async (user: User) => {
  try {
    await usersApi.toggleStatus(user.id)
    message.success('操作成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

const handleResetPassword = (user: User) => {
  currentUser.value = user
  resetFormData.newPassword = ''
  showResetModal.value = true
}

const handleResetSubmit = async () => {
  try {
    await resetFormRef.value?.validate()
  } catch (errors) {
    return
  }

  if (!currentUser.value) return

  submitting.value = true
  try {
    await usersApi.resetPassword(currentUser.value.id, { newPassword: resetFormData.newPassword })
    message.success('密码重置成功')
    showResetModal.value = false
  } catch (error: any) {
    message.error(error.message || '密码重置失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await usersApi.delete(id)
    message.success('删除成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  loadData()
  loadDepartments()
})
</script>