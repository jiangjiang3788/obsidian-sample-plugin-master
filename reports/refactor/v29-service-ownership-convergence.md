# V29 Service Ownership Convergence

主题：`ItemService` / `ThemeManager` ownership 收敛。

本版目标不是继续扩大 UI 或类型债改造，而是把两个容易继续吞职责的运行时服务拆成：

- 稳定 facade：保留旧 import path 和对外 API。
- 内聚子模块：把定位、写回、完成任务、块元数据、迁移备份、主题匹配等能力拆开。
- 领域语义下沉：theme matching 不再由 settings feature 文件承载。

## 改造范围

### 1. ItemService 变薄 facade

旧文件：

```text
src/core/services/ItemService.ts
```

V28 中该文件同时承担：

- itemId 解析；
- Markdown 文件读取与写回；
- task line 定位；
- 完成任务 / 追加完成记录；
- inline field upsert；
- block metadata upsert；
- 目标迁移备份；
- DataStore 自动刷新。

V29 后保留旧入口为兼容 facade：

```text
src/core/services/ItemService.ts
```

实际实现进入：

```text
src/core/services/item/
  ItemService.ts
  ItemLocator.ts
  ItemMutationWriter.ts
  TaskCompletionMutation.ts
  InlineFieldMutation.ts
  GoalTemplateMigrationMutation.ts
  MigrationBackupService.ts
  itemId.ts
  lineMetadata.ts
  types.ts
  index.ts
```

职责拆分：

| 文件 | 职责 |
| --- | --- |
| `ItemService.ts` | DI 组装与 public API facade |
| `ItemLocator.ts` | itemId -> path/lineNo，读取文件，解析可变 task context |
| `ItemMutationWriter.ts` | Markdown lines 写回与 DataStore 自动刷新 |
| `TaskCompletionMutation.ts` | `completeItem`、`appendCompletionRecord`、`updateItemTime` |
| `InlineFieldMutation.ts` | task inline `(key:: value)` 回填 |
| `GoalTemplateMigrationMutation.ts` | 目标模板迁移的 task-inline / block-metadata 写回 |
| `MigrationBackupService.ts` | settings 与 markdown 文件迁移前备份 |
| `itemId.ts` | itemId 解析与 path 安全提取 |
| `lineMetadata.ts` | inline kv 与 block metadata 行 upsert 语义 |
| `types.ts` | mutation option / result 类型 |

### 2. ThemeManager ownership 调整

旧文件：

```text
src/features/settings/theme/ThemeManager.ts
```

V28 中该文件既是 settings feature 下的文件，又承担 core DataStore 依赖的 `IThemeMatcher` 实现。V29 调整为：

```text
src/core/theme/ThemeManager.ts
src/core/theme/themeMatching.ts
src/core/theme/themeManagerSemantics.ts
src/features/settings/theme/ThemeManager.ts
```

职责拆分：

| 文件 | 职责 |
| --- | --- |
| `src/core/theme/ThemeManager.ts` | 主题运行时注册表与 `IThemeMatcher` 实现 |
| `src/core/theme/themeMatching.ts` | partial header -> full theme path 的纯匹配语义 |
| `src/core/theme/themeManagerSemantics.ts` | theme 创建、父级、分组、统计、层级等纯语义 |
| `src/features/settings/theme/ThemeManager.ts` | 兼容 facade，继续导出 `ThemeManager` |

同时将 app composition root 改为从 core theme facade 注册：

```text
src/app/bootstrap/register.ts
```

由：

```ts
import { ThemeManager } from '@features/settings/theme/ThemeManager';
```

改为：

```ts
import { ThemeManager } from '@core/theme/public';
```

这样 settings feature 不再拥有 core 需要依赖的 matcher 语义。

## 兼容性策略

本版保留以下旧路径：

```text
src/core/services/ItemService.ts
src/features/settings/theme/ThemeManager.ts
```

它们都只做 compatibility facade，不继续写新业务逻辑。现有外部调用方不需要改 import。

## 行数变化

关键文件拆分结果：

| 文件 | V28 | V29 |
| --- | ---: | ---: |
| `src/core/services/ItemService.ts` | 387 | 9 |
| `src/core/services/item/ItemService.ts` | - | 90 |
| `src/features/settings/theme/ThemeManager.ts` | 404 | 2 |
| `src/core/theme/ThemeManager.ts` | - | 191 |
| `src/core/theme/themeMatching.ts` | - | 73 |
| `src/core/theme/themeManagerSemantics.ts` | - | 110 |

## 指标对比

| 指标 | V28 | V29 |
| --- | ---: | ---: |
| src files | 742 | 756 |
| src lines | 71,111 | 71,307 |
| TS-like lines | 63,860 | 64,056 |
| files >= 500 lines | 0 | 0 |
| non-CSS files >= 500 lines | 0 | 0 |
| TS-like files >= 450 lines | 0 | 0 |
| TSX files >= 350 lines | 1 | 1 |
| explicit any | 652 | 648 |
| @core/public importers | 0 | 0 |
| @shared/public importers | 0 | 0 |
| duplicate function-name groups | 50 | 50 |

文件数和总行数上升是预期结果：本版做的是 ownership 拆分，而不是压缩代码行数。收益是 `ItemService` 与 `ThemeManager` 不再继续作为职责桶增长。

## 已执行验证

通过：

```bash
npm run gate
npm run refactor:verify
npm run refactor:metrics
npm run refactor:hotspots
npm run refactor:budget
npm run refactor:release
npm run folder:verify
npm run schema:gate
```

尝试执行：

```bash
npm run typecheck:src -- --pretty false
```

当前源码包没有 `node_modules`，缺少：

```text
@types/node
preact
vite/client
```

因此完整 typecheck 仍需要在本地 `npm ci` 后执行。

## 本版不做的事

V29 不处理：

- view model 的 `any` 类型债；
- heatmap / timeline / statistics view model 收敛；
- `core/public.ts` 面积压缩；
- CSS 文件治理；
- V31 预算封版。

这些留给 V30 / V31。

## 下一版建议：V30 Type Debt Convergence

V30 建议聚焦 explicit any 热点：

```text
src/features/settings/views/models/heatmapViewModel.ts
src/features/settings/views/runtime/TimelineView/TimelineViewModel.ts
src/features/settings/views/models/statisticsViewModel.ts
src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx
src/core/records/RecordNormalizer.ts
src/core/services/ActionService.ts
src/core/recordInput/RecordInputFacade.ts
```

目标：

```text
explicit any: 648 -> ≤600
```

并开始为 V31 的预算 gate 锁定做准备。
