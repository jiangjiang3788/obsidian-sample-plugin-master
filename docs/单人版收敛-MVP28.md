# 单人版收敛 MVP28：AI 动态输入边界 any 清理

MVP28 是类型治理第三步。MVP26 建立 `any-budget:gate` 和 `UnknownRecord` 安全读取工具，MVP27 清掉 QuickInput / editState 两个核心输入模型文件的显式 `any`。本轮继续处理 AI 动态输入边界和本地检索兜底边界，目标不是重写 AI 功能，而是把不可信输入留在边界，用最小类型和 reader 进入模型代码。

## 目标

- 不继续拆视图。
- 不机械替换全局 `any`。
- 优先处理 AI 输出、AI 批量确认、MiniSearch 兜底结果这类动态边界。
- 继续收紧 `any-budget`，让下降结果进入标准 gate。

## 修改内容

### AiNaturalLanguageRecordParser

修改文件：

```text
src/core/ai/AiNaturalLanguageRecordParser.ts
```

主要变化：

- 新增 `AiParserSnapshot`、`AiSnapshotBlock`、`AiSnapshotGoal`、`AiSnapshotPreset` 等最小快照类型。
- `ensureCommandTarget` 改为接受 `unknown` 边界，不再用 `item: any`。
- `cleanAiFieldValues` 改为 `unknown -> Record<string, unknown>`，并继续过滤系统上下文字段。
- `findBlockByTarget`、`findGoalByTarget`、`findPresetByTarget` 不再对 snapshot/target 使用 `any`。
- `safeJsonParseBatch` 将 `JSON.parse` 结果先视为 `unknown`，再通过 `coerceNaturalRecordBatch` 收敛为 `NaturalRecordBatch`。
- `buildSystemPrompt`、`buildUserPrompt`、`buildFastUserPrompt` 改用最小快照类型。

结果：该文件显式 `any` 从 43 降到 0。

### AiBatchConfirmModel

修改文件：

```text
src/platform/modals/AiBatchConfirmModel.ts
```

主要变化：

- `blocks` 从 `any[]` 收紧为 `BlockTemplate[]`。
- `themes` 从 `any[]` 收紧为 `ThemeDefinition[]`。
- `goalSettings` 收紧为 `GoalSettings | undefined`。
- `inputSettings` 收紧为 `InputSettings`。
- `resolveGoalForAiTarget` 返回 `GoalDefinition | null`。
- `resolvePresetForAiTarget` 返回 `GoalTemplate | null`。
- `readPresetThemePath` 改用 `asUnknownRecord + readFirstString` 读取 `defaultValues`，不再直接访问 `any.value`。
- `formData` 和确认上下文改为 `Record<string, unknown>`。

结果：该文件显式 `any` 从 19 降到 0。

### RetrievalService

修改文件：

```text
src/core/ai/RetrievalService.ts
```

主要变化：

- `normalizeText` 里的对象读取改用 `UnknownRecord`。
- `SearchResult` 兜底字段读取改为 `getSearchResultRecord`、`readSearchResultText`、`readSearchResultNumber`。
- `applyFilters` 不再使用 `(sr as any)` 读取 `themePath/type/templateId/categoryKey`。
- `searchResultToItem` 不再使用 `(sr as any)` 拼回兜底 Item。
- MiniSearch `extractField` 改用 `document[fieldName as keyof SearchIndexDocument]`。

结果：该文件显式 `any` 从 22 降到 0。

### any-budget 收紧

修改文件：

```text
scripts/gates/any-budget-gate.mjs
```

MVP28 后预算继续下调：

| 范围 | MVP27 实际 / 预算 | MVP28 实际 | MVP28 预算 |
|---|---:|---:|---:|
| `src` | 1017 / 1020 | 933 | 935 |
| `test` | 164 / 165 | 164 | 165 |
| `scripts` | 2 / 15 | 2 | 15 |
| 总计 | 1183 / 1185 | 1099 | 1105 |
| `as any` | 578 / 580 | 556 | 560 |
| `: any` | 510 / 515 | 456 | 460 |

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

当前环境没有 `node_modules`，仍缺少：

```text
node
preact
vite/client
```

## 下一步

MVP29 建议处理下一个高性价比类型债区域：

- `src/features/settings/goalTemplates/GoalTemplateEditorModel.ts`
- `src/core/utils/itemFilter.ts`
- `src/core/fields/FieldValueResolver.ts`

目标：继续优先治理模型层和数据核心，不先碰 `FloatingPanel / Fields` 这类 UI primitive。
