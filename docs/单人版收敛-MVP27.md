# 单人版收敛 MVP27：核心输入链路 any 第一刀

MVP27 是类型治理的第二步，也是第一轮真正降低 `src` 显式 `any` 的版本。MVP26 建立了 `any-budget:gate` 和 `UnknownRecord` 安全读取工具；本轮开始把高风险核心输入链路从 `any` 改成明确的最小领域类型。

## 目标

- 不再继续拆视图或小组件。
- 不做全局机械替换。
- 优先处理已经位于模型层、且 `any` 数量最高的核心输入文件。
- 收紧 `any-budget`，让下降结果进入标准 gate。

## 修改内容

### QuickInputEditorModel

修改文件：

```text
src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts
```

主要变化：

- 新增 `QuickInputFormData`，替代大量 `Record<string, any>`。
- 新增 `QuickInputContext`，将调用上下文从 `any` 收敛为 `Record<string, unknown>`。
- 新增 `QuickInputOptionLike`，替代选项值判断里的 `any`。
- 新增 `QuickInputTemplateLike`，把 QuickInput 所需的模板形状约束到 `BlockTemplate / TemplateField` 的最小子集。
- 新增 `QuickInputPeriodLike`，替代周期上下文里的 `any`。
- `isMeaningfulValue`、`isSameValue`、字段更新、模板默认值 hydrate、初始 selection 推导等模型函数改用 `unknown` 和最小类型。
- `deriveQuickInputInitialSelection` 开始使用 `readFirstString` / `readRecord` 读取 `__goalContext`，避免继续把动态上下文当成 `any` 横向传播。
- `sortOrder` 读取改用 `asUnknownRecord + readNumber`。

结果：该文件从 `any` top files 第一名退出，显式 `any` 清到 0。

### editStateResolver

修改文件：

```text
src/core/services/recordInput/editStateResolver.ts
```

主要变化：

- 编辑态回填中的 field 参数从 `any` 改为 `TemplateField`。
- block 评分、任务/块模板识别从 `any` 改为 `BlockTemplate`。
- rating/path/select 选项匹配改用 `TemplateField.options` 的已有类型。
- `readCoreBlockHint` 改用 `asUnknownRecord + readFirstString`，不再通过 `(item as any)` 读取 `coreBlock/coreBlockId`。
- `buildInitialFormData` 的 template 入参收紧为 `BlockTemplate`。

结果：该文件从 top files 中退出，显式 `any` 清到 0。

### any-budget 收紧

修改文件：

```text
scripts/gates/any-budget-gate.mjs
```

MVP27 后预算从 MVP26 基线下调：

| 范围 | MVP26 基线/预算 | MVP27 实际 | MVP27 预算 |
|---|---:|---:|---:|
| `src` | 1087 / 1090 | 1017 | 1020 |
| `test` | 164 / 165 | 164 | 165 |
| `scripts` | 2 / 15 | 2 | 15 |
| 总计 | 1253 / 1260 | 1183 | 1185 |
| `as any` | 583 / 585 | 578 | 580 |
| `: any` | 555 / 560 | 510 | 515 |

## 验证

已通过：

```bash
npm run any-budget:gate
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

MVP28 建议处理 AI 动态输入边界：

- `src/core/ai/AiNaturalLanguageRecordParser.ts`
- `src/platform/modals/AiBatchConfirmModel.ts`
- `src/core/ai/RetrievalService.ts`

目标：把 AI 输出从 `any` 改成 `unknown + decoder/reader`，继续降低 `src` any 预算。
