<div align="center">

# 24小时出入量记录系统

**数字化出入量记录 · 智能预警 · 数据可视化**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748.svg)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57.svg)](https://www.sqlite.org/)

</div>

---

## 目录

- [简介](#简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [数据库设计](#数据库设计)
- [部署指南](#部署指南)
- [浏览器支持](#浏览器支持)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 简介

**24小时出入量记录系统** 是一个专为医疗机构设计的数字化出入量管理系统。系统支持患者通过手机扫码录入出入量数据，护士进行确认和统计，管理员进行系统配置和数据管理。

### 核心价值

| 痛点 | 解决方案 |
|------|----------|
| 手工记录麻烦、易遗漏 | 手机扫码录入，支持语音输入 |
| 记录格式不统一 | 标准化录入表单，自动验证 |
| 汇总计算效率低 | 自动统计，实时数据可视化 |
| 护士查看管理不便 | 仪表盘、预警提醒、批量操作 |

---

## 功能特性

### 患者端（H5 移动端）

```
┌─────────────────────────────────────────────────────────┐
│  扫码验证 → 选择项目 → 输入数量 → 保存记录 → 查看统计    │
└─────────────────────────────────────────────────────────┘
```

- **身份验证** - 扫码确认身份，防冒充机制
- **入量记录** - 饮水、汤类、牛奶、果汁等
- **出量记录** - 尿量、大便（Bristol 分型）、呕吐物
- **语音输入** - Web Speech API 语音识别
- **记录管理** - 查看、编辑、删除待确认记录
- **统计查看** - 24小时出入量统计、平衡量

### 护士端（响应式网页）

- **仪表盘** - 在院人数、待确认记录、今日入量、预警数
- **记录查询** - 多条件筛选、分页、批量确认
- **病人管理** - 入院登记、出院处理、信息维护
- **床位管理** - 床位卡片、绑定/解绑、二维码生成
- **统计分析** - ECharts 图表、趋势分析、数据导出
- **预警系统** - 少尿、多尿、无尿、出入量失衡预警

### 管理员

- **科室管理** - 科室信息维护
- **用户管理** - 科室账号创建、密码重置
- **预设项目** - 出入量项目配置、权限设置
- **系统配置** - 预警阈值、班次设置
- **数据备份** - 自动备份、手动备份、数据恢复
- **操作日志** - 完整审计追踪

---

## 技术栈

<div align="center">

| 层级 | 技术选型 |
|:----:|----------|
| **个人端** | Vue 3 + Vite + TypeScript + Vant 4 + Pinia |
| **护士端** | Vue 3 + Vite + TypeScript + Naive UI + Pinia + ECharts 5 |
| **后端** | Node.js + Express + TypeScript |
| **ORM** | Prisma (类型安全、自动迁移) |
| **数据库** | SQLite (WAL 模式、本地存储) |
| **包管理** | pnpm workspace (monorepo) |
| **进程管理** | PM2 (生产环境) |

</div>

### 选型理由

| 组件 | 选择 | 理由 |
|------|------|------|
| 移动端 UI | Vant 4 | 移动端首选，触摸体验优秀 |
| 桌面端 UI | Naive UI | Vue 3 原生，TypeScript 支持好 |
| 图表库 | ECharts 5 | 功能完整，中文文档丰富 |
| ORM | Prisma | 类型安全，自动迁移，SQLite 支持 |
| 数据库 | SQLite | 轻量级，本地存储，WAL 模式并发友好 |

---

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0（推荐）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-username/intake-and-output.git
cd intake-and-output

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
pnpm --filter server db:generate
pnpm --filter server db:push
pnpm --filter server db:seed

# 4. 启动所有服务
pnpm dev:all
```

### 单独启动服务

```bash
pnpm dev          # 后端 API (http://localhost:3000)
pnpm dev:patient  # 患者端 (http://localhost:3001)
pnpm dev:nurse    # 护士端 (http://localhost:5174)
```

### 默认账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | 全部权限 |
| 护士 | `nk_nurse` | `nurse123` | 科室内数据管理 |

### 验证安装

```bash
# 检查后端健康状态
curl http://localhost:3000/api/health

# 预期响应
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## 项目结构

```
intake-and-output/
├── packages/
│   ├── server/                    # 后端 API 服务
│   │   ├── prisma/
│   │   │   └── schema.prisma      # 数据库模型定义
│   │   └── src/
│   │       ├── index.ts           # 入口文件
│   │       ├── lib/               # 工具库
│   │       ├── middleware/         # 中间件
│   │       ├── routes/            # 路由控制器
│   │       ├── utils/             # 工具函数
│   │       └── prisma/            # 种子数据
│   │
│   ├── patient-app/               # 患者端应用
│   │   └── src/
│   │       ├── api/               # API 接口
│   │       ├── router/            # 路由配置
│   │       ├── stores/            # Pinia 状态
│   │       ├── views/             # 页面组件
│   │       └── utils/             # 工具函数
│   │
│   └── nurse-app/                 # 护士端应用
│       └── src/
│           ├── api/               # API 接口
│           ├── components/        # 公共组件
│           ├── composables/       # 组合式函数
│           ├── layouts/           # 布局组件
│           ├── router/            # 路由配置
│           ├── stores/            # Pinia 状态
│           ├── views/             # 页面组件
│           └── utils/             # 工具函数
│
├── DOC/                           # 项目文档
│   ├── docs/                      # 需求文档
│   ├── design/                    # 设计文档
│   └── architecture/              # 架构文档
│
├── pnpm-workspace.yaml            # pnpm 工作空间配置
├── package.json                   # 根 package.json
└── README.md                      # 项目说明
```

---

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Token（Bearer）
- **请求格式**: JSON
- **响应格式**: `{ code, message, data }`

### API 端点

| 模块 | 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|:----:|
| **认证** | `/auth/login` | POST | 用户登录 | ✗ |
| | `/auth/logout` | POST | 用户登出 | ✓ |
| | `/auth/me` | GET | 当前用户 | ✓ |
| **病人** | `/patients` | GET | 病人列表 | ✓ |
| | `/patients` | POST | 创建病人 | ✓ |
| | `/patients/:id` | GET | 病人详情 | ✓ |
| | `/patients/:id` | PUT | 更新病人 | ✓ |
| | `/patients/:id/discharge` | POST | 出院处理 | ✓ |
| **床位** | `/beds` | GET | 床位列表 | ✓ |
| | `/beds` | POST | 创建床位 | ✓ |
| | `/beds/:id/bind` | POST | 绑定病人 | ✓ |
| | `/beds/:id/unbind` | POST | 解绑病人 | ✓ |
| | `/beds/:id/qrcode` | GET | 获取二维码 | ✓ |
| **记录** | `/records` | GET | 记录列表 | ✓ |
| | `/records` | POST | 创建记录 | ✗ |
| | `/records/:id` | PUT | 更新记录 | ✗ |
| | `/records/:id` | DELETE | 删除记录 | ✗ |
| | `/records/:id/confirm` | POST | 确认记录 | ✓ |
| | `/records/:id/unconfirm` | POST | 撤销确认 | ✓ |
| **统计** | `/statistics/daily` | GET | 24小时统计 | ✓ |
| | `/statistics/custom` | GET | 自定义统计 | ✓ |
| | `/statistics/shift` | GET | 班次统计 | ✓ |
| **预警** | `/alerts` | GET | 预警列表 | ✓ |
| | `/alerts/config` | GET | 阈值配置 | ✓ |
| | `/alerts/config` | PUT | 更新阈值 | ✓ |
| **配置** | `/config` | GET | 系统配置 | ✓ |
| | `/config` | PUT | 更新配置 | ✓ |
| | `/shifts` | GET | 班次列表 | ✓ |
| **导出** | `/export/excel` | GET | 导出 Excel | ✓ |
| | `/export/pdf` | GET | 导出 PDF | ✓ |

### 响应示例

```json
// 成功响应
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}

// 错误响应
{
  "code": 400,
  "message": "Validation error",
  "data": null
}
```

---

## 数据库设计

### ER 关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Department │       │    User     │       │   Patient   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────│ departmentId│       │ id          │
│ name        │       │ username    │       │ name        │
│ code        │       │ role        │       │ hospitalNum │
└─────────────┘       └─────────────┘       │ bedNumber   │
                            │               └─────────────┘
                            │                       │
                            ▼                       ▼
                    ┌─────────────────────────────────────┐
                    │      IntakeOutputRecord             │
                    ├─────────────────────────────────────┤
                    │ id, patientId, recordType           │
                    │ itemName, amount, unit              │
                    │ recordTime, confirmedAt             │
                    │ recordedBy, confirmedBy             │
                    └─────────────────────────────────────┘
```

### 核心表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `departments` | 科室 | name, code |
| `users` | 用户 | username, role, departmentId |
| `patients` | 病人 | name, hospitalNumber, bedNumber, status |
| `beds` | 床位 | bedNumber, departmentId, patientId |
| `preset_items` | 预设项目 | name, type, unit, permission |
| `intake_output_records` | 出入量记录 | patientId, recordType, itemName, amount |
| `record_change_logs` | 修改历史 | recordId, fieldName, oldValue, newValue |
| `alert_records` | 预警记录 | patientId, alertType, thresholdValue |
| `shift_configs` | 班次配置 | name, startTime, endTime |
| `operation_logs` | 操作日志 | userId, operationType, targetTable |

---

## 部署指南

### 开发环境

```bash
pnpm dev:all
```

### 生产环境

```bash
# 构建前端
pnpm build:patient
pnpm build:nurse

# 启动后端
pnpm --filter server start
```

### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start packages/server/dist/index.js --name intake-output

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 患者端
    location /patient {
        alias /path/to/patient-app/dist;
        try_files $uri $uri/ /patient/index.html;
    }

    # 护士端
    location /nurse {
        alias /path/to/nurse-app/dist;
        try_files $uri $uri/ /nurse/index.html;
    }
}
```

---

## 浏览器支持

| 浏览器 | 版本 | 支持状态 |
|--------|:----:|:--------:|
| Chrome | >= 87 | ✓ |
| Firefox | >= 78 | ✓ |
| Safari | >= 14 | ✓ |
| Edge | >= 88 | ✓ |
| iOS Safari | >= 14 | ✓ |
| Android Chrome | >= 87 | ✓ |

---

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. **Fork** 本仓库
2. **创建** 功能分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 更改 (`git commit -m 'feat: add AmazingFeature'`)
4. **推送** 到分支 (`git push origin feature/AmazingFeature`)
5. **创建** Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 编写单元测试（推荐）
- 更新相关文档

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/intake-and-output/issues)
- **Email**: your-email@example.com

---

## 更新日志

### v1.0.0 (2026-06-03)

**核心功能**
- ✅ 病人管理（入院、出院、信息维护）
- ✅ 床位管理（绑定、解绑、二维码）
- ✅ 出入量记录（手动、语音输入）
- ✅ 护士确认流程
- ✅ 24小时统计
- ✅ 自定义时间段统计
- ✅ 预警系统（少尿、多尿、无尿、失衡）
- ✅ 数据导出（Excel、PDF）
- ✅ 操作日志审计

**技术实现**
- ✅ Monorepo 架构（pnpm workspace）
- ✅ 前后端分离
- ✅ JWT 认证
- ✅ SQLite WAL 模式
- ✅ 响应式设计

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！**

</div>
