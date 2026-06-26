# 单人版收敛 MVP29：模板模型与字段筛选核心 any 清理

## 目标

MVP29 继续类型治理，但仍不进入 UI primitive 和纯展示组件。目标是先处理模型层 / 数据核心中的显式 `any`：

- `GoalTemplateEditorModel.ts`
- `itemFilter.ts`
- `FieldValueResolver.ts`

这些文件分别影响目标记录预设编辑、视图筛选排序和字段值解析，属于比 `FloatingPanel` / `Fields` 更高价值的类型治理目标。

## 改动摘要

| 文件 | 改动 |
|---|---|
| `src/features/settings/goalTemplates/GoalTemplateEditorModel.ts` | 用 `ThemeDefinition`、`UnknownRecord`、`TemplateField` 原生字段替代显式 `any`；模板字段、主题字段、周期粒度和稳定 JSON 比较不再依赖 `as any` |
| `src/core/utils/itemFilter.ts` | 把比较、列表、between、规则值全部收紧为 `unknown`；预处理小写字段改用 `UnknownRecord` reader |
| `src/core/fields/FieldValueResolver.ts` | 文件字段、分类字段、周期字段、goalPaths、动态 canonical 字段改用 `UnknownRecord` reader 或 `Item` 原生字段 |
| `scripts/gates/any-budget-gate.mjs` | 继续收紧预算，要求 src any 不超过 875，总量不超过 1040 |

## any 变化

| 指标 | MVP28 | MVP29 |
|---|---:|---:|
| `src` 显式 `any` | 933 | 870 |
| `test` 显式 `any` | 164 | 164 |
| `scripts` 显式 `any` | 2 | 2 |
| 总显式 `any` | 1099 | 1036 |
| `as any` | 556 | 516 |
| `: any` | 456 | 436 |

## 文件级结果

| 文件 | 结果 |
|---|---:|
| `GoalTemplateEditorModel.ts` | 显式 `any` 从 28 降到 0 |
| `itemFilter.ts` | 显式 `any` 从 19 降到 0 |
| `FieldValueResolver.ts` | 显式 `any` 从 16 降到 0 |

## 设计原则

这版没有把类型治理做成机械替换：

- 动态输入仍保持 `unknown`，由 `UnknownRecord` reader 读取。
- 模型层能用领域类型时，优先使用 `GoalTemplate`、`TemplateField`、`ThemeDefinition`、`Item`。
- 不为了降低数字而写大段不可信 `as Foo`。
- 不提前处理 UI primitive，因为本轮优先级是数据核心。

## 验证

已通过：

```bash
npm run any-budget:gate
npm run docs-governance:gate
npm run final-convergence:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因仍然是当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。

## 下一步建议

MVP30 建议继续处理模型层和业务数据边界，而不是 UI primitive：

1. `src/core/goal/overview.ts`
2. `src/app/actions/recordCreateActions.ts`
3. `src/features/settings/viewModels/heatmapViewModel.ts`
4. `src/shared/ui/views/TimelineView/TimelineViewModel.ts`

目标是把 `src` 显式 `any` 从 870 继续压到 800 左右。
