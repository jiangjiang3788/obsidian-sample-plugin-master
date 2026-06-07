# Think OS P0 修复包报告

## 本版定位

本版不新增大功能，优先修复 Phase 1 深度审查中确认的 P0 主链问题：

- 快速输入编辑态使用 `GoalTemplateResolver`，但提交保存态仍回到旧 `TemplateResolver` 的 Block × Theme override 链。
- 任务模板依赖 `{{状态.value}}`，且 `singleSelect` 未进入默认选项填充逻辑，容易输出非 Markdown Task 行，导致任务不能被 Obsidian/Tasks 识别。
- 快速输入设置页仍公开 `ThemeMatrix`，强化旧的 Block × Theme 模板矩阵入口。

## 已完成改动

### 1. 提交保存主链切到 Goal × Block

修改文件：

- `src/core/services/recordInput/RecordInputKernel.ts`
- `src/core/services/recordInput/dependencyResolver.ts`
- `src/app/usecases/recordInput/templateSubmit.ts`
- `src/app/usecases/recordInput.usecase.ts`
- `src/core/services/GoalTemplateResolver.ts`

改动内容：

- `RecordInputKernel` 构造参数从 `InputSettings` 升级为完整 `ThinkSettings`。
- `dependencyResolver` 改为使用 `GoalTemplateResolver.resolve()`。
- 提交前解析依赖时传入 `context + formData`，可读取 `goalId / 目标ID / goalPath / 目标 / themePath / 主题`。
- `GoalTemplateResolver` 在没有显式 themePath 时，可从 themeId 反查主题路径，仅用于主题 metadata，不作为模板选择主轴。

现在提交链路应为：

```txt
QuickInput formData/context
  ↓
RecordInputKernel
  ↓
dependencyResolver
  ↓
GoalTemplateResolver(goalId/goalPath + blockId)
  ↓
InputService executeTemplate
```

### 2. 统一预览/保存 renderData

修改文件：

- `src/core/services/InputService.ts`
- `src/core/services/recordInput/snapshot/OutputPlanner.ts`

改动内容：

- `InputService.previewTemplateExecution()` 改为调用 `buildRecordOutputPlan()`。
- `InputService.updateExistingRecord()` 也改为调用 `buildRecordOutputPlan()`。
- 这样预览、创建、编辑尽量复用同一套 renderData/outputPlan 逻辑，减少“界面看到 A，保存写到 B”的漂移。

### 3. 修复任务状态 token

修改文件：

- `src/core/services/recordInput/snapshot/OutputPlanner.ts`
- `src/core/blocks/defaultCoreBlocks.ts`
- `data.json`
- `src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx`

新增渲染 token：

```txt
taskStatusPrefix = - [ ] 或 - [x]
taskDateToken    = 📅 2026-06-06 / 🛫 2026-06-06 / ✅ 2026-06-06
repeatToken      = 🔁 every day / every week / every month / every year
```

默认任务模板改为：

```md
{{taskStatusPrefix}} {{theme.icon}}{{任务内容}} (目标ID::{{goalId}}) (目标::{{goalPath}}) (主题::{{themePath}}) (核心Block::task) (时间::{{时间}}) (结束::{{结束}}) (时长::{{时长}}) (模板ID::{{templateId}}) (模板来源::{{templateSourceType}}) {{repeatToken}} {{taskDateToken}}
```

并修复 `singleSelect` 不自动默认选择的问题。

### 4. 隐藏快速输入设置里的 ThemeMatrix

修改文件：

- `src/features/settings/tabs/InputSettings.tsx`

改动内容：

- 从快速输入设置页移除 `ThemeMatrix` 渲染入口。
- 保留说明文字：主题模板矩阵已隐藏，新主链为“目标 × Block 模板”。
- 主题后续应进入独立“数据管理/主题管理”页面，只负责 path/icon/color 等 metadata。

## 已通过验证

已通过以下 gate：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/dual-system-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/events-boundary-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/di-resolve-gate.mjs
node scripts/gates/modal-promise-gate.mjs
node scripts/gates/selector-giant-subscription-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

## 未完成 / 需本地验证

`npm run typecheck:src` 当前环境失败原因是缺少依赖类型包：

```txt
Cannot find type definition file for 'node'
Cannot find type definition file for 'preact'
Cannot find type definition file for 'vite/client'
```

请本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 下一步建议

下一版建议继续做：

1. 新增“数据管理”页面，主题管理从快速输入页独立出来。
2. 主题管理只保留 path/icon/color/排序/合并，不再编辑模板。
3. 目标中心继续收敛，只保留目标、目标模板、指标、候选建议。
4. 为 `GoalTemplateResolver` 和任务 token 增加单元测试。
