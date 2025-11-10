# 代码库简化与重构计划

本文档旨在解决当前代码库中存在的重复代码问题，并提出一个分阶段、可执行的简化方案。

## 🔍 发现的重复代码问题

基于代码扫描结果，我们识别出以下主要问题：

### 1. **类型定义重复** (最严重)

在多个文件中（超过30个）发现了完全相同的 `BatchOperationType` 等类型定义。

```typescript
// 在多个文件中重复定义
export type BatchOperationType = 'activate' | 'archive' | 'delete'; // 文件A
export type BatchOperationType = 'activate' | 'archive' | 'delete'; // 文件B
export type BatchOperationType = 'activate' | 'archive' | 'delete'; // 文件C
```

### 2. **相同的工具函数散落**

通用的辅助函数（如路径处理、数组操作）在超过6个以上的文件中被重复实现。

```typescript
// 在多个文件中都有类似代码
const normalizedPath = path.trim().toLowerCase();
const parts = path.split('/');
const lastSlash = path.lastIndexOf('/');
```

### 3. **Store操作模式重复**

每个数据存储（Store）都包含相似的CRUD（创建、读取、更新、删除）逻辑模式，缺乏统一的抽象。

```typescript
// 每个Store都有相似的CRUD模式
const newItems = [...items];
const index = newItems.findIndex(item => item.id === id);
if (index !== -1) { newItems[index] = updated; }
```

---

## 💡 简化方案

我们将分三个阶段进行重构，以确保每一步都是可控且可验证的。

### 阶段1：统一数据定义 (预计2天)

**目标：** 消除类型和常量的重复，建立单一事实来源 (Single Source of Truth)。

1.  **创建统一的类型文件**:
    在 `src/types/shared.ts`（或 `src/types/common.ts`）中定义所有共享的TypeScript类型。
    ```typescript
    // src/types/shared.ts
    export type BatchOperationType = 'activate' | 'archive' | 'delete';
    export type SelectionMode = 'theme' | 'block' | 'cell';
    // ... 整合所有重复的类型
    ```

2.  **创建统一的常量文件**:
    在 `src/constants/index.ts` 中定义所有全局常量。
    ```typescript
    // src/constants/index.ts
    export const UI_CONSTANTS = {
      BATCH_OPERATIONS: ['activate', 'archive', 'delete'],
      DEFAULT_NAMES: { /* ... */ }
    }
    ```

3.  **全局替换**:
    在整个项目中，将所有重复的本地定义替换为从中央文件导入。

**影响文件：** 约30个
**收益：** 消除90%的类型重复，为后续重构打下坚实基础。

### 阶段2：提取通用工具函数 (预计1天)

**目标：** 将重复的业务无关逻辑提取到统一的工具函数模块中。

1.  **创建工具函数文件**:
    在 `src/utils/common.ts` (或 `src/lib/utils.ts`) 中创建通用的工具函数。
    ```typescript
    // src/utils/common.ts
    export const pathUtils = {
      normalize: (path: string) => path.trim().toLowerCase(),
      getSegments: (path: string) => path.split('/'),
      getParent: (path: string) => { /* ... */ }
    }

    export const arrayUtils = {
      updateById: <T extends {id: string}>(items: T[], id: string, updates: Partial<T>): T[] => { /* ... */ },
      removeById: <T extends {id: string}>(items: T[], id: string): T[] => { /* ... */ }
    }
    ```

2.  **重构现有代码**:
    将项目中所有重复实现的逻辑替换为对新工具函数的调用。

**影响文件：** 约20个
**收益：** 减少约50%的重复逻辑，提高代码复用性。

### 阶段3：简化UI库 (预计3天)

**目标：** 降低UI组件的复杂性和维护成本。

#### 方案A：保持Preact，简化组件

- 创建一个统一的基础组件库 (`src/components/common`)。
- 将现有复杂的UI组件重构为更简单、更通用的形式。
  ```typescript
  // src/components/common/SimpleButton.tsx
  export const SimpleButton = ({ children, onClick, variant = 'default' }) => (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
  ```

#### 方案B：完全去除MUI依赖 (更激进)

- 移除 `@mui/material`、`@emotion/react`、`@emotion/styled` 等重度依赖。
- 使用简单的CSS Modules或Tailwind CSS配合基础HTML组件来重建UI。
- **优点**: 大幅减少打包体积（预计减少50%），提升应用性能。
- **缺点**: 工作量较大，需要重新实现所有UI组件。

**影响文件：** 约15个组件文件
**收益：** 大幅简化UI维护成本，提升性能。

---

## 📊 预期效果

| 优化项         | 预计删除代码行数 | 预计简化文件数 | 维护复杂度降低 |
|----------------|------------------|----------------|----------------|
| 统一类型定义   | ~500行           | 30个文件       | 70%            |
| 提取通用函数   | ~300行           | 20个文件       | 60%            |
| 简化UI库       | ~800行           | 15个文件       | 80%            |
| **总计**       | **~1600行**      | **~65个文件**  | **显著降低**   |

---

## 🎯 最简化建议与第一步

如果时间有限，**强烈建议首先完成阶段1：统一类型定义**。

**具体步骤：**

1.  创建 `src/types/index.ts` 或 `src/types/common.ts` 文件。
2.  将所有分散的、重复的类型定义迁移到此文件中并导出。
3.  在整个代码库中进行全局搜索和替换，将本地定义改为从中央文件导入。
4.  运行TypeScript编译器 (`tsc --noEmit`) 验证所有类型引用都已正确修复，确保项目能够无错误编译。

这一步是整个重构工作的基石，工作量相对最小，但收益最为明显，能立即解决最主要的重复代码问题。
