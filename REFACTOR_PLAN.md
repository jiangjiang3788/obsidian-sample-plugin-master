# Obsidian插件功能模块化架构重构计划

## 📋 项目概述

本文档详细描述了将当前Obsidian插件从深层嵌套架构重构为功能模块化架构的完整计划。

### 重构目标
- ✅ 最大2层深度：任何文件路径不超过2层嵌套
- ✅ 功能内聚：相关功能放在同一目录中
- ✅ 避免重复：消除重复的文件和逻辑
- ✅ 渐进式重构：分阶段进行，确保每步都可构建

## 🔍 当前架构问题分析

### 层次过深问题
```
❌ src/lib/services/core/ActionService.ts     (3层)
❌ src/lib/types/domain/theme.ts              (3层)
❌ src/store/stores/TimerStore.ts             (2层，但功能分散)
```

### 功能分散问题
- 计时器功能分散在：`lib/services/core/TimerService.ts`, `store/stores/TimerStore.ts`
- 类型定义重复：`src/types/` 和 `src/lib/types/domain/`
- Store管理分散：多个Store在不同层级

## 🎯 目标架构设计

### 新架构结构
```
src/
├── core/                           # 核心基础设施 (≤2层)
│   ├── services/                   # 核心服务
│   │   ├── ActionService.ts        # 从 lib/services/core/ 迁移
│   │   ├── DataStore.ts           
│   │   ├── RendererService.ts     
│   │   └── index.ts
│   ├── types/                      # 核心类型定义  
│   │   ├── core.ts                # 核心系统类型
│   │   ├── plugin.ts              # 插件相关类型
│   │   └── index.ts
│   ├── utils/                      # 核心工具函数
│   │   ├── error.ts               # 错误处理
│   │   ├── performance.ts         # 性能监控
│   │   └── index.ts
│   └── stores/                     # 核心Store
│       ├── AppStore.ts            # 主应用Store
│       └── index.ts
│
├── features/                       # 功能模块 (≤2层)
│   ├── timer/                      # 计时器功能模块
│   │   ├── services/               # 计时器相关服务
│   │   │   ├── TimerService.ts     # 从 lib/services/core/ 迁移
│   │   │   ├── TimerStateService.ts
│   │   │   └── index.ts
│   │   ├── stores/                 # 计时器Store
│   │   │   ├── TimerStore.ts       # 从 store/stores/ 迁移
│   │   │   └── index.ts
│   │   ├── components/             # 计时器组件
│   │   │   ├── FloatingTimerWidget.ts
│   │   │   └── index.ts
│   │   ├── types/                  # 计时器相关类型
│   │   │   ├── timer.ts
│   │   │   └── index.ts
│   │   └── index.ts                # 功能模块统一导出
│   │
│   ├── settings/                   # 设置功能模块
│   │   ├── stores/
│   │   │   ├── SettingsStore.ts    # 从 store/stores/ 迁移
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── SettingsPanel.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── settings.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── dashboard/                  # 仪表盘功能
│   │   ├── stores/
│   │   │   ├── BlockStore.ts       # 从 store/stores/ 迁移
│   │   │   ├── LayoutStore.ts      
│   │   │   ├── ViewInstanceStore.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── Dashboard.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── dashboard.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── theme/                      # 主题功能模块
│       ├── stores/
│       │   ├── ThemeStore.ts       # 从 store/stores/ 迁移
│       │   └── index.ts
│       ├── services/
│       │   ├── ThemeManager.ts     # 从 lib/services/core/ 迁移
│       │   └── index.ts
│       ├── types/
│       │   ├── theme.ts            # 从 lib/types/domain/ 迁移
│       │   └── index.ts
│       └── index.ts
│
├── shared/                         # 共享资源 (≤2层)
│   ├── components/                 # 通用UI组件
│   │   ├── common/                 # 基础组件
│   │   ├── layout/                 # 布局组件
│   │   └── index.ts
│   ├── hooks/                      # 共享React hooks
│   │   ├── useTimer.ts
│   │   ├── useSettings.ts
│   │   └── index.ts
│   ├── types/                      # 通用类型定义
│   │   ├── common.ts               # 从 src/types/ 迁移
│   │   ├── ui.ts                   # UI相关类型
│   │   └── index.ts
│   ├── utils/                      # 通用工具函数
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   └── constants/                  # 共享常量
│       ├── index.ts                # 从 src/constants/ 迁移
│       └── config.ts
│
├── main.ts                         # 入口文件
└── preact-shim.d.ts               # 保持不变
```

## 🚀 实施阶段

### 阶段1：基础架构搭建 (30分钟)
- [ ] 创建新的目录结构
- [ ] 更新 tsconfig.json 路径映射
- [ ] 创建各模块的 index.ts 文件

### 阶段2：核心服务迁移 (45分钟)
- [ ] 迁移 core 服务：ActionService, DataStore, RendererService
- [ ] 迁移 core 工具函数
- [ ] 迁移 AppStore
- [ ] 更新相关导入路径

### 阶段3：功能模块迁移 (60分钟)
- [ ] 迁移 timer 功能模块
- [ ] 迁移 settings 功能模块  
- [ ] 迁移 dashboard 功能模块
- [ ] 迁移 theme 功能模块

### 阶段4：共享资源整理 (30分钟)
- [ ] 整理共享类型定义
- [ ] 迁移通用工具函数
- [ ] 整理常量定义

### 阶段5：清理和验证 (30分钟)
- [ ] 删除旧目录
- [ ] 验证构建成功
- [ ] 运行测试
- [ ] 更新文档

## 📋 详细迁移映射

### 文件迁移对照表

#### 核心服务迁移
```
src/lib/services/core/ActionService.ts     → src/core/services/ActionService.ts
src/lib/services/core/dataStore.ts         → src/core/services/DataStore.ts
src/lib/services/core/RendererService.ts   → src/core/services/RendererService.ts
src/lib/services/core/inputService.ts      → src/core/services/InputService.ts
src/lib/services/core/taskService.ts       → src/core/services/TaskService.ts
src/lib/services/core/storage.ts           → src/core/services/StorageService.ts
src/store/AppStore.ts                      → src/core/stores/AppStore.ts
```

#### 计时器功能迁移
```
src/lib/services/core/TimerService.ts      → src/features/timer/services/TimerService.ts
src/lib/services/core/TimerStateService.ts → src/features/timer/services/TimerStateService.ts
src/store/stores/TimerStore.ts             → src/features/timer/stores/TimerStore.ts
src/views/Timer/FloatingTimerWidget.*      → src/features/timer/components/
```

#### 主题功能迁移
```
src/lib/services/core/ThemeManager.ts      → src/features/theme/services/ThemeManager.ts
src/lib/types/domain/theme.ts              → src/features/theme/types/theme.ts
src/store/stores/ThemeStore.ts             → src/features/theme/stores/ThemeStore.ts
```

#### 仪表盘功能迁移
```
src/store/stores/BlockStore.ts             → src/features/dashboard/stores/BlockStore.ts
src/store/stores/LayoutStore.ts            → src/features/dashboard/stores/LayoutStore.ts
src/store/stores/ViewInstanceStore.ts      → src/features/dashboard/stores/ViewInstanceStore.ts
src/views/Dashboard/*                      → src/features/dashboard/components/
```

#### 设置功能迁移
```
src/store/stores/SettingsStore.ts          → src/features/settings/stores/SettingsStore.ts
src/views/Settings/*                       → src/features/settings/components/
```

#### 共享资源迁移
```
src/types/common.ts                        → src/shared/types/common.ts
src/constants/index.ts                     → src/shared/constants/index.ts
src/lib/types/domain/*.ts                  → src/shared/types/
src/lib/utils/                             → src/shared/utils/
```

### 导入路径更新映射
```typescript
// 核心服务
'@/lib/services/core/'     → '@/core/services/'
'@lib/services/core/'      → '@core/services/'
'@store/AppStore'          → '@core/stores/AppStore'

// 功能模块
'@store/stores/TimerStore'     → '@features/timer/stores/TimerStore'
'@store/stores/ThemeStore'     → '@features/theme/stores/ThemeStore'
'@store/stores/SettingsStore'  → '@features/settings/stores/SettingsStore'

// 共享资源
'@/types/'                 → '@/shared/types/'
'@constants/'              → '@shared/constants/'
'@lib/types/domain/'       → '@shared/types/'
```

## 🔧 自动化工具

### Node.js 迁移脚本功能
- 🏗️ 目录结构自动创建
- 📁 文件批量迁移
- 🔗 导入路径自动更新
- 📝 index.ts 文件生成
- ✅ 构建验证
- 📊 迁移报告生成

### 使用方法
```bash
# 执行迁移
node scripts/migrate-architecture.js

# 仅预览（不实际执行）
node scripts/migrate-architecture.js --dry-run

# 迁移指定模块
node scripts/migrate-architecture.js --module=timer
```

## ⚠️ 风险控制

### 备份策略
- ✅ Git提交当前代码
- ✅ 创建备份分支
- ✅ 每个阶段单独提交

### 验证点
- ✅ 每个阶段后验证构建成功
- ✅ 运行现有测试
- ✅ 检查TypeScript类型错误

### 回滚策略
- ✅ 保留原始文件直到验证完成
- ✅ 分阶段提交，便于回滚
- ✅ 关键节点创建标签

## 📈 预期收益

### 架构清晰度
- ✅ 功能内聚，职责明确
- ✅ 依赖关系简化
- ✅ 新功能开发效率提升

### 开发体验
- ✅ 导入路径语义化
- ✅ 代码定位更快
- ✅ 模块独立测试

### 长期维护
- ✅ 功能扩展容易
- ✅ 技术债务减少
- ✅ 团队协作效率提升

---

**开始时间：** `待定`  
**预计完成时间：** `3.5小时`  
**负责人：** `开发团队`  
**状态：** `计划中` → `执行中` → `已完成`
