<template>
  <div class="beds-page">
    <n-card title="床位管理">
      <template #header-extra>
        <n-button v-if="authStore.isAdmin" type="primary" @click="openAddModal">
          添加床位
        </n-button>
      </template>

      <n-space style="margin-bottom: 16px">
        <n-select
          v-model:value="filters.status"
          :options="statusOptions"
          placeholder="状态"
          style="width: 120px"
          clearable
          @update:value="loadData"
        />
        <n-button type="primary" @click="loadData">查询</n-button>
      </n-space>

      <n-spin :show="loading">
        <n-grid :cols="4" :x-gap="16" :y-gap="16">
          <n-gi v-for="bed in beds" :key="bed.id">
            <n-card
              :class="['bed-card', bed.status]"
              hoverable
            >
              <template #header>
                <n-space align="center" justify="space-between">
                  <span>床位 {{ bed.number }}</span>
                  <n-tag :type="bed.status === 'occupied' ? 'success' : 'default'" size="small">
                    {{ bed.status === 'occupied' ? '已分配' : '空闲' }}
                  </n-tag>
                </n-space>
              </template>
              <div v-if="bed.patientName" class="bed-info">
                <p><strong>病人:</strong> {{ bed.patientName }}</p>
                <p><strong>住院号:</strong> {{ bed.hospitalNumber }}</p>
              </div>
              <div v-else class="bed-empty">
                暂无病人
              </div>
              <template #footer>
                <n-space>
                  <n-button
                    v-if="bed.status === 'free'"
                    size="small"
                    type="primary"
                    @click="handleBind(bed)"
                  >
                    绑定病人
                  </n-button>
                  <n-button
                    v-else
                    size="small"
                    type="warning"
                    @click="handleUnbind(bed)"
                  >
                    解绑
                  </n-button>
                  <n-button size="small" @click="handleShowQRCode(bed)">
                    二维码
                  </n-button>
                  <n-button size="small" @click="handleEdit(bed)">
                    编辑
                  </n-button>
                </n-space>
              </template>
            </n-card>
          </n-gi>
        </n-grid>
        <n-empty v-if="beds.length === 0" description="暂无床位" style="padding: 40px" />
      </n-spin>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <n-pagination
          v-model:page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          @update:page="loadData"
        />
      </div>
    </n-card>

    <n-modal v-model:show="showAddModal" preset="card" title="添加床位" style="width: 400px">
      <n-form
        ref="addFormRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="60"
      >
        <n-form-item label="编号" path="number">
          <n-input v-model:value="formData.number" placeholder="请输入床位编号" />
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

    <n-modal v-model:show="showEditModal" preset="card" title="编辑床位" style="width: 400px">
      <n-form
        ref="editFormRef"
        :model="editFormData"
        :rules="formRules"
        label-placement="left"
        label-width="60"
      >
        <n-form-item label="编号" path="number">
          <n-input v-model:value="editFormData.number" placeholder="请输入床位编号" />
        </n-form-item>
        <n-form-item label="科室" path="departmentId">
          <n-select
            v-model:value="editFormData.departmentId"
            :options="departmentOptions"
            placeholder="请选择科室"
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

    <n-modal v-model:show="showBindModal" preset="card" title="绑定病人" style="width: 500px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="住院号">
          <n-input
            v-model:value="bindHospitalNumber"
            placeholder="请输入住院号搜索病人"
            @keyup.enter="searchPatient"
          >
            <template #suffix>
              <n-button text @click="searchPatient">搜索</n-button>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item v-if="searchedPatient" label="病人信息">
          <n-descriptions :column="1" bordered size="small">
            <n-descriptions-item label="姓名">{{ searchedPatient.name }}</n-descriptions-item>
            <n-descriptions-item label="住院号">{{ searchedPatient.hospitalNumber }}</n-descriptions-item>
            <n-descriptions-item label="性别">{{ searchedPatient.gender === 'male' ? '男' : '女' }}</n-descriptions-item>
            <n-descriptions-item label="年龄">{{ searchedPatient.age }}</n-descriptions-item>
          </n-descriptions>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBindModal = false">取消</n-button>
          <n-button
            type="primary"
            :loading="submitting"
            :disabled="!searchedPatient"
            @click="handleBindSubmit"
          >
            绑定
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showQRCodeModal" preset="card" title="床位二维码" style="width: 350px">
      <div style="text-align: center">
        <canvas ref="qrCodeCanvas"></canvas>
        <p style="margin-top: 16px">床位 {{ currentBed?.number }}</p>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import QRCode from 'qrcode'
import { bedsApi, type Bed } from '@/api/modules/beds'
import { patientsApi, type Patient } from '@/api/modules/patients'
import { departmentsApi } from '@/api/modules/departments'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const beds = ref<Bed[]>([])
const departmentOptions = ref<Array<{ label: string; value: string }>>([])

const filters = reactive({
  status: null as string | null
})

const statusOptions = [
  { label: '空闲', value: 'free' },
  { label: '已分配', value: 'occupied' }
]

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0
})

const showAddModal = ref(false)
const showEditModal = ref(false)
const showBindModal = ref(false)
const showQRCodeModal = ref(false)
const addFormRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)
const qrCodeCanvas = ref<HTMLCanvasElement | null>(null)
const currentBed = ref<Bed | null>(null)

const formData = reactive({
  number: '',
  departmentId: ''
})

const editFormData = reactive({
  id: '',
  number: '',
  departmentId: ''
})

const formRules: FormRules = {
  number: [{ required: true, message: '请输入床位编号', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }]
}

const bindHospitalNumber = ref('')
const searchedPatient = ref<Patient | null>(null)

const loadData = async () => {
  loading.value = true
  try {
    const res = await bedsApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status as any
    })
    beds.value = res.items || []
    pagination.itemCount = res.total || 0
  } catch (error: any) {
    message.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  try {
    const res: any = await departmentsApi.list()
    const departments = res.data || []

    departmentOptions.value = departments.map((department: any) => ({
      label: department.name,
      value: department.id
    }))

    if (!formData.departmentId) {
      formData.departmentId = authStore.user?.departmentId || departmentOptions.value[0]?.value || ''
    }

    if (!editFormData.departmentId) {
      editFormData.departmentId = authStore.user?.departmentId || departmentOptions.value[0]?.value || ''
    }
  } catch (error: any) {
    message.error(error.message || '加载科室失败')
  }
}

const openAddModal = async () => {
  if (departmentOptions.value.length === 0) {
    await loadDepartments()
  }

  formData.number = ''
  formData.departmentId = authStore.user?.departmentId || departmentOptions.value[0]?.value || ''
  showAddModal.value = true
}

const handleSubmit = async () => {
  try {
    await addFormRef.value?.validate()
  } catch (errors) {
    return
  }

  submitting.value = true
  try {
    await bedsApi.create(formData)
    message.success('添加成功')
    showAddModal.value = false
    formData.number = ''
    formData.departmentId = authStore.user?.departmentId || departmentOptions.value[0]?.value || ''
    loadData()
  } catch (error: any) {
    message.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

const handleEdit = (bed: Bed) => {
  currentBed.value = bed
  editFormData.id = bed.id
  editFormData.number = bed.number
  editFormData.departmentId = bed.departmentId
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
    await bedsApi.update(editFormData.id, editFormData)
    message.success('更新成功')
    showEditModal.value = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

const handleBind = (bed: Bed) => {
  currentBed.value = bed
  bindHospitalNumber.value = ''
  searchedPatient.value = null
  showBindModal.value = true
}

const searchPatient = async () => {
  if (!bindHospitalNumber.value) {
    message.warning('请输入住院号')
    return
  }

  try {
    searchedPatient.value = await patientsApi.getByHospitalNumber(bindHospitalNumber.value)
  } catch (error: any) {
    searchedPatient.value = null
    message.error(error.message || '未找到病人')
  }
}

const handleBindSubmit = async () => {
  if (!currentBed.value || !searchedPatient.value) return

  submitting.value = true
  try {
    await bedsApi.bind(currentBed.value.id, { patientId: searchedPatient.value.id })
    message.success('绑定成功')
    showBindModal.value = false
    loadData()
  } catch (error: any) {
    message.error(error.message || '绑定失败')
  } finally {
    submitting.value = false
  }
}

const handleUnbind = async (bed: Bed) => {
  try {
    await bedsApi.unbind(bed.id)
    message.success('解绑成功')
    loadData()
  } catch (error: any) {
    message.error(error.message || '解绑失败')
  }
}

const handleShowQRCode = async (bed: Bed) => {
  currentBed.value = bed
  showQRCodeModal.value = true

  await nextTick()

  if (qrCodeCanvas.value) {
    try {
      const qrCodeData = await bedsApi.getQRCode(bed.id)
      await QRCode.toCanvas(qrCodeCanvas.value, qrCodeData.qrCode, {
        width: 256,
        margin: 2
      })
    } catch (error) {
      // Fallback: generate QR code with bed info
      await QRCode.toCanvas(qrCodeCanvas.value, `bed:${bed.id}:${bed.number}`, {
        width: 256,
        margin: 2
      })
    }
  }
}

onMounted(() => {
  loadDepartments()
  loadData()
})
</script>

<style scoped>
.beds-page {
  min-height: 100%;
}

.bed-card {
  height: 100%;
}

.bed-card.occupied {
  border-left: 4px solid #52c41a;
}

.bed-card.free {
  border-left: 4px solid #d9d9d9;
}

.bed-info p {
  margin: 4px 0;
  font-size: 14px;
}

.bed-empty {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}
</style>
