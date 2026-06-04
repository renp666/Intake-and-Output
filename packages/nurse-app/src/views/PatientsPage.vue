<template>
  <div class="patients-page">
    <n-card title="病人管理">
      <template #header-extra>
        <n-button type="primary" @click="openAddModal">
          添加病人
        </n-button>
      </template>

      <n-space style="margin-bottom: 16px">
        <n-input
          v-model:value="filters.keyword"
          placeholder="搜索姓名/住院号"
          clearable
          style="width: 200px"
          @clear="loadData"
          @keyup.enter="loadData"
        />
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          placeholder="状态"
          style="width: 120px"
          @update:value="loadData"
        />
        <n-button type="primary" @click="loadData">查询</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="patients"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: any) => row.id"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <n-modal v-model:show="showAddModal" preset="card" title="添加病人" style="width: 600px">
      <n-form
        ref="addFormRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="住院号" path="hospitalNumber">
          <n-input v-model:value="formData.hospitalNumber" placeholder="请输入住院号" />
        </n-form-item>
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入姓名" />
        </n-form-item>
        <n-form-item label="性别" path="gender">
          <n-radio-group v-model:value="formData.gender">
            <n-radio value="male">男</n-radio>
            <n-radio value="female">女</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="年龄" path="age">
          <n-input-number v-model:value="formData.age" :min="0" :max="150" placeholder="年龄" style="width: 100%" />
        </n-form-item>
        <n-form-item label="入院日期" path="admissionDate">
          <n-date-picker v-model:value="formData.admissionDate" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="主治医生" path="doctorName">
          <n-input v-model:value="formData.doctorName" placeholder="请输入主治医生" />
        </n-form-item>
        <n-form-item label="诊断" path="diagnosis">
          <n-input v-model:value="formData.diagnosis" type="textarea" placeholder="请输入诊断" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="formData.notes" type="textarea" placeholder="备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showEditModal" preset="card" title="编辑病人" style="width: 600px">
      <n-form
        ref="editFormRef"
        :model="editFormData"
        :rules="formRules"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="住院号" path="hospitalNumber">
          <n-input v-model:value="editFormData.hospitalNumber" placeholder="请输入住院号" />
        </n-form-item>
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="editFormData.name" placeholder="请输入姓名" />
        </n-form-item>
        <n-form-item label="性别" path="gender">
          <n-radio-group v-model:value="editFormData.gender">
            <n-radio value="male">男</n-radio>
            <n-radio value="female">女</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="年龄" path="age">
          <n-input-number v-model:value="editFormData.age" :min="0" :max="150" placeholder="年龄" style="width: 100%" />
        </n-form-item>
        <n-form-item label="入院日期" path="admissionDate">
          <n-date-picker v-model:value="editFormData.admissionDate" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="主治医生" path="doctorName">
          <n-input v-model:value="editFormData.doctorName" placeholder="请输入主治医生" />
        </n-form-item>
        <n-form-item label="诊断" path="diagnosis">
          <n-input v-model:value="editFormData.diagnosis" type="textarea" placeholder="请输入诊断" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="editFormData.notes" type="textarea" placeholder="备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleEditSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <ConfirmDialog
      v-model:visible="showDischargeDialog"
      title="确认出院"
      :content="`确定要将 ${currentPatient?.name} 办理出院吗？`"
      :record-info="currentPatient"
      @confirm="handleDischargeSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NTag, NSpace, NPopconfirm, type FormInst, type FormRules } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { patientsApi, type Patient } from '@/api/modules/patients'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const patients = ref<Patient[]>([])

const filters = reactive({
  keyword: '',
  status: 'admitted' as string
})

const statusOptions = [
  { label: '未出院', value: 'admitted' },
  { label: '已出院', value: 'discharged' },
  { label: '全部', value: 'all' }
]

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: (info: any) => `共 ${info?.itemCount ?? 0} 条`
})

const columns: DataTableColumns<Patient> = [
  { title: '床位', key: 'bedNumber', width: 80, render: (row) => row.bedNumber || '-' },
  { title: '姓名', key: 'name', width: 100 },
  { title: '住院号', key: 'hospitalNumber', width: 120 },
  { title: '性别', key: 'gender', width: 60, render: (row) => row.gender === 'male' ? '男' : '女' },
  { title: '年龄', key: 'age', width: 60 },
  {
    title: '入院日期',
    key: 'admissionDate',
    width: 120,
    render: (row) => new Date(row.admissionDate).toLocaleDateString('zh-CN')
  },
  { title: '主治医生', key: 'doctorName', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.status === 'admitted' ? 'success' : 'default',
        size: 'small'
      }, { default: () => row.status === 'admitted' ? '在院' : '出院' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render: (row) => {
      const buttons = [
        h(NButton, {
          size: 'small',
          onClick: () => handleEdit(row)
        }, { default: () => '编辑' })
      ]

      if (row.status === 'admitted') {
        buttons.push(
          h(NPopconfirm, {
            onPositiveClick: () => handleDischarge(row)
          }, {
            trigger: () => h(NButton, { size: 'small', type: 'warning' }, { default: () => '出院' }),
            default: () => `确定要将 ${row.name} 办理出院吗？`
          })
        )
      }

      return h(NSpace, { size: 'small' }, { default: () => buttons })
    }
  }
]

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDischargeDialog = ref(false)
const currentPatient = ref<Patient | null>(null)
const addFormRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)

const formData = reactive({
  hospitalNumber: '',
  name: '',
  gender: 'male' as 'male' | 'female',
  age: null as number | null,
  admissionDate: null as number | null,
  doctorName: '',
  diagnosis: '',
  notes: ''
})

const editFormData = reactive({
  id: '',
  hospitalNumber: '',
  name: '',
  gender: 'male' as 'male' | 'female',
  age: null as number | null,
  admissionDate: null as number | null,
  doctorName: '',
  diagnosis: '',
  notes: ''
})

const formRules: FormRules = {
  hospitalNumber: [{ required: true, message: '请输入住院号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await patientsApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      status: filters.status as any
    })
    patients.value = res.items || []
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
    await patientsApi.create({
      ...formData,
      admissionDate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : undefined
    } as any)
    message.success('添加成功')
    showAddModal.value = false
    resetForm()
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const openAddModal = () => {
  resetForm()
  showAddModal.value = true
}

const handleEdit = (patient: Patient) => {
  currentPatient.value = patient
  editFormData.id = patient.id
  editFormData.hospitalNumber = patient.hospitalNumber
  editFormData.name = patient.name
  editFormData.gender = patient.gender
  editFormData.age = patient.age
  editFormData.admissionDate = new Date(patient.admissionDate).getTime()
  editFormData.doctorName = patient.doctorName
  editFormData.diagnosis = patient.diagnosis
  editFormData.notes = patient.notes || ''
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
    await patientsApi.update(editFormData.id, {
      ...editFormData,
      admissionDate: editFormData.admissionDate ? new Date(editFormData.admissionDate).toISOString() : undefined
    } as any)
    message.success('更新成功')
    showEditModal.value = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

const handleDischarge = (patient: Patient) => {
  currentPatient.value = patient
  showDischargeDialog.value = true
}

const handleDischargeSubmit = async (operatorName: string) => {
  if (!currentPatient.value) return

  try {
    await patientsApi.discharge(currentPatient.value.id, { operatorName })
    message.success('出院成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '出院失败')
  }
}

const resetForm = () => {
  formData.hospitalNumber = ''
  formData.name = ''
  formData.gender = 'male'
  formData.age = null
  formData.admissionDate = null
  formData.doctorName = ''
  formData.diagnosis = ''
  formData.notes = ''
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.patients-page {
  min-height: 100%;
}
</style>
