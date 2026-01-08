# S5 架构约束文档

## 概述

本文档定义了 S5（真源唯一）规范的架构约束，确保 ViewInstance / Layout 的 CRUD 和 reorder 只存在一个写入口。

## 核心原则

### 1. 唯一写入口（Facade 模式）

```
features 层 → useCases.layout.* → slice actions → SettingsRepository
```

**✅ 允许的调用路径：**
- `src/features/**` → `useCases.layout.*`

**⛔ 禁止的调用路径：**
- `src/features/**` → `viewInstance.slice` 的 vi* actions
- `src/features/**` → `viewInstance.usecase`
- `src/features/**` → `group.usecase`
- `src/features/**` → `AppStore` 的已禁用方法

### 2. 层级职责

| 层级 | 文件 | 职责 | 可被调用者 |
|------|------|------|-----------|
| Features | `src/features/**` | UI 组件 | - |
| UseCase (Facade) | `layout.usecase.ts` | 唯一写入口 | features |
| UseCase (Internal) | `viewInstance.usecase.ts` | 已禁用 | - |
| UseCase (Disabled) | `group.usecase.ts` | 已禁用 | - |
| Slice | `layout.slice.ts` | 底层实现 | useCases |
| Slice | `viewInstance.slice.ts` | 底层实现 | useCases |
| Repository | `SettingsRepository.ts` | 持久化 | slices |

## API 映射

### Layout 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 添加布局 | `layoutUseCase.addLayout()` | `state.addLayout()` |
| 更新布局 | `layoutUseCase.updateLayout()` | `state.updateLayout()` |
| 删除布局 | `layoutUseCase.deleteLayout()` | `state.deleteLayout()` |
| 移动布局 | `layoutUseCase.moveLayout()` | `state.moveLayout()` |
| 复制布局 | `layoutUseCase.duplicateLayout()` | `state.duplicateLayout()` |
| 重排布局 | `layoutUseCase.reorderLayouts()` | `state.reorderLayouts()` |

### View 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 添加视图 | `layoutUseCase.addView()` | `state.viAddViewInstance()` |
| 更新视图 | `layoutUseCase.updateView()` | `state.viUpdateViewInstance()` |
| 删除视图 | `layoutUseCase.deleteView()` | `state.viDeleteViewInstance()` |
| 移动视图 | `layoutUseCase.moveView()` | `state.viMoveViewInstance()` |
| 复制视图 | `layoutUseCase.duplicateView()` | `state.viDuplicateViewInstance()` |

### 查询操作

| 操作 | UseCase API |
|------|-------------|
| 获取所有布局 | `layoutUseCase.getLayouts()` |
| 获取单个布局 | `layoutUseCase.getLayout(id)` |
| 按父级获取 | `layoutUseCase.getLayoutsByParent(parentId)` |
| 获取顶级布局 | `layoutUseCase.getTopLevelLayouts()` |

## 禁用功能

### Group 功能

Group 移动/分组存在问题，当前策略是**完全禁用**：

- `group.usecase.ts` - 所有方法抛出异常
- `group.slice.ts` - 保留但不使用
- `GroupStore.ts` - 已禁用

### Legacy Stores

以下 legacy stores 已禁用，构造函数会抛出异常：

- `ViewInstanceStore.ts`
- `GroupStore.ts`
- `LayoutStore.ts`

## 迁移指引

### 从 ViewInstanceStore 迁移

```typescript
// ❌ 旧代码
const store = new ViewInstanceStore(app);
await store.addViewInstance(title);

// ✅ 新代码
import { createLayoutUseCase } from '@/app/usecases/layout.usecase';
const layoutUseCase = createLayoutUseCase();
await layoutUseCase.addView(title);
```

### 从 viewInstance.usecase 迁移

```typescript
// ❌ 旧代码
import { createViewInstanceUseCase } from '@/app/usecases/viewInstance.usecase';
const viUseCase = createViewInstanceUseCase();
await viUseCase.addViewInstance(title);

// ✅ 新代码
import { createLayoutUseCase } from '@/app/usecases/layout.usecase';
const layoutUseCase = createLayoutUseCase();
await layoutUseCase.addView(title);
```

### 从 AppStore 迁移

```typescript
// ❌ 旧代码
const appStore = AppStore.getInstance();
await appStore.addViewInstance(title);

// ✅ 新代码
import { createLayoutUseCase } from '@/app/usecases/layout.usecase';
const layoutUseCase = createLayoutUseCase();
await layoutUseCase.addView(title);
```

## ESLint 规则

项目配置了 ESLint 规则禁止 features 层直接 import slices：

```javascript
// .eslintrc-architecture.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/app/store/slices/*', '../app/store/slices/*'],
        message: '[S5] features 层禁止直接 import slices，请使用 useCases.layout'
      }]
    }]
  }
}
```

## 验收标准

1. ✅ ViewInstance / Layout 的所有写操作最终都经过 `useCases.layout.*`
2. ✅ 不存在两套"都能改 settings"的路径
3. ✅ 禁用 group 的策略保持不变
4. ✅ Legacy stores 构造时抛出异常
5. ✅ ESLint 规则阻止违规 import

## 文件清单

### 唯一写入口
- `src/app/usecases/layout.usecase.ts` - ✅ Facade

### 底层实现（仅供 useCases 使用）
- `src/app/store/slices/layout.slice.ts`
- `src/app/store/slices/viewInstance.slice.ts`

### 已禁用
- `src/app/usecases/viewInstance.usecase.ts` - ⛔ 抛出异常
- `src/app/usecases/group.usecase.ts` - ⛔ 抛出异常
- `src/features/settings/ViewInstanceStore.ts` - ⛔ 抛出异常
- `src/features/settings/GroupStore.ts` - ⛔ 抛出异常
- `src/features/settings/LayoutStore.ts` - ⛔ 抛出异常
