<template>
  <div class="settings-page">
    <n-card title="系统设置">
      <n-grid :cols="3" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in settingItems" :key="item.path">
          <n-card hoverable @click="router.push(item.path)" style="cursor: pointer">
            <template #header>
              <n-space align="center">
                <n-icon :component="item.icon" size="24" color="#1890ff" />
                <span>{{ item.title }}</span>
              </n-space>
            </template>
            <p style="color: #666; margin: 0">{{ item.description }}</p>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <router-view style="margin-top: 16px" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  ApartmentOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  AuditOutlined
} from '@vicons/antd'

const router = useRouter()

const settingItems = [
  {
    title: '科室管理',
    path: '/settings/departments',
    icon: ApartmentOutlined,
    description: '管理医院科室信息，添加、编辑、删除科室'
  },
  {
    title: '用户管理',
    path: '/settings/users',
    icon: TeamOutlined,
    description: '管理系统用户，包括护士和管理员账户'
  },
  {
    title: '预设项目',
    path: '/settings/preset-items',
    icon: UnorderedListOutlined,
    description: '管理出入量预设项目，如饮水、输液、尿量等'
  },
  {
    title: '系统配置',
    path: '/settings/system',
    icon: ToolOutlined,
    description: '配置系统参数，如预警阈值、数据备份等'
  },
  {
    title: '班次配置',
    path: '/settings/shifts',
    icon: ClockCircleOutlined,
    description: '配置工作班次，如白班、夜班、大夜班等'
  },
  {
    title: '操作日志',
    path: '/settings/logs',
    icon: AuditOutlined,
    description: '查看系统操作日志，追踪用户操作记录'
  }
]
</script>

<style scoped>
.settings-page {
  min-height: 100%;
}
</style>