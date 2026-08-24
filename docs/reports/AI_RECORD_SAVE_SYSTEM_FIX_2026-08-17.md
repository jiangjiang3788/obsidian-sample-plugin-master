# AI 快速记录“点击保存无反应”系统修复报告

日期：2026-08-17  
范围：AI 自然语言快速记录 → 批量确认 Modal → RecordInput 提交 → 持久化/刷新

## 1. 现象

AI 已经能把自然语言解析成任务/记录，确认界面也能正常显示，但桌面端点击“保存此条”或“保存全部”时可能表现为没有反应；同时某些异常提交路径也可能没有任何可见错误提示。

## 2. 端到端链路

实际调用路径是：

1. `src/features/aiinput/aiNaturalInputCommand.ts`
   - 调用 `AiNaturalLanguageRecordParser`
   - 得到 `NaturalRecordCommand[]`
   - 打开 `AiBatchConfirmModal`
2. `src/platform/obsidian/modals/AiBatchConfirmModal.tsx`
   - 使用 `QuickInputEditor` 让用户确认/修改 AI 结果
   - “保存此条/保存全部”调用 `useCases.recordInput.submitCreateRecord(...)`
3. `src/app/usecases/recordInput/workflows/CreateRecordWorkflow.ts`
   - 解析 Goal/Block 模板
   - 归一化和校验字段
   - 执行模板写入
   - 重新扫描目标文件并确认 Record ID 真正出现
4. `DataStore` 刷新视图。

## 3. 根因

### 3.1 主因：AI 确认窗口没有采用 QuickInput 已验证的桌面提交事件策略

普通 QuickInput 已经针对 Obsidian 桌面端编辑器做了专门保护：保存按钮在 `pointerdown/mousedown` 阶段触发提交，并 `preventDefault()`，避免输入控件先失焦、触发状态更新/重渲染后吞掉后续 click。

AI 批量确认窗口此前仍然只使用普通 `onClick`：

- `AiBatchConfirmFooter` 的“保存此条”只绑定 `onClick`
- `AiBatchConfirmSidebar` 的“保存全部”只绑定 `onClick`

这与项目中已经成熟的 `QuickInputModalFooter + useQuickInputSubmitController` 行为不一致，是“点击后看起来完全没反应”的最直接源码差异。

### 3.2 RecordInput 的错误边界不完整

`CreateRecordWorkflow` / `UpdateRecordWorkflow` 之前把模板解析、依赖解析、字段归一化、输出计划等步骤放在 `try/catch` 外。

AI 输出、旧数据或模板字段一旦在这些阶段抛异常，Promise 会直接 reject，而不是返回统一的 `RecordSubmitResult`。旧 AI Modal 又没有自己的异常兜底，因此用户可能看不到任何 Notice。

### 3.3 AI Modal 缺少提交状态与重复提交保护

此前没有：

- 保存中状态
- 同步 pending gate
- 防止双击/Pointer + Click 重复提交
- 保存中禁用“跳过/完成/保存全部/侧栏切换”
- 异常 catch + 可见错误 Notice
- cancelled 的明确提示

所以即便提交已经开始，视觉上仍会像“没点到”。

### 3.4 必填字段约束只存在于 QuickInput UI，而不在 RecordInput 领域提交边界

`assertRecordInputRequiredFields(...)` 只在普通 QuickInput 提交控制器里执行；AI batch 直接调用 RecordInput use case，可以绕过 UI 校验。

这会让不同入口的保存规则不一致。修复后必填校验进入 `validateRecordInput(...)`，AI、QuickInput、未来 API/批处理入口统一生效。

### 3.5 AI 字段 label/key 存在归一化缺口

AI prompt 同时向模型展示字段 `key` 和 `label`。模型可能返回中文 label，而模板内部真正使用另一个 key。

以前 `normalizeRecordInputFormDataForTemplate(...)` 只在 `field.key` 已存在时归一化，label-only 值不会映射到 key。修复后：

- label-only AI 值会同步到模板 key
- 领域校验也支持 `key -> label` 回退读取
- UI 必填判断与领域必填判断对空数组/空 option 的语义保持一致

### 3.6 批量结果对 `partial_success` 的统计不一致

AI Modal 已把 `partial_success` 当作“已经写入”，但 `buildBatchCreateRecordSubmitResult(...)` 以前却把它归类为失败。

修复后它被计入已持久化成功，同时在汇总 Notice 中明确“其中 N 条有警告”。

### 3.7 解析 trace 到保存阶段断链

原来的 `traceId` 只覆盖 AI 解析/HTTP 阶段，打开确认 Modal 后日志链就结束了。

现在 `traceId` 会传入 `AiBatchConfirmModal`，并记录：

- 单条提交前/后
- 批量提交开始
- 每条提交状态
- 批量汇总状态
- 未捕获保存异常

日志只记录索引、Block ID、结果状态和是否产生 Record ID，不记录用户正文。

## 4. 主要改动

### UI/交互

- `AiBatchConfirmFooter.tsx`
  - 桌面端改为 pointer/mouse down 提交
  - 移动端保留 click 提交
  - 增加 loading、busy、disabled 状态
- `AiBatchConfirmSidebar.tsx`
  - “保存全部”采用相同桌面提交策略
  - 保存中禁止切换记录/重复提交
- `AiBatchConfirmModal.tsx`
  - 增加同步 pending gate
  - 始终读取当前 `QuickInputEditor` 最新状态再提交
  - `onRequestSubmit` 接入同一保存链路
  - success / partial_success / cancelled / validation_error / error 全部有明确反馈
  - catch 未预期异常并显示 Notice
  - 保存中阻止 UI 内关闭/完成操作
  - 贯穿 AI traceId
- `AiBatchConfirmSubmitFeedback.ts`
  - 集中保存日志与错误提示，避免 Modal 膨胀

### RecordInput 领域/工作流

- `CreateRecordWorkflow.ts`
  - 把 prepare/normalize/validate 全部纳入结果型错误边界
- `UpdateRecordWorkflow.ts`
  - 同样把 prepare/output/persistence plan 纳入错误边界
- `validation.ts`
  - 领域层统一必填字段校验
  - 支持字段 label 回退
- `RecordInputFacade.ts`
  - required array 只在至少一个元素有真实值时才算已填写
  - AI label 值映射到模板 key
  - batch `partial_success` 汇总语义修正

### 回归测试

新增：

- `test/unit/aiBatchConfirmFooter.test.tsx`
  - 桌面端 pointer/mousedown 提交，不依赖 click
  - mobile-like 环境仍走 click
- `test/unit/recordInputValidation.test.ts`
  - 非 UI/AI caller 也会被必填字段校验
  - 空 option/空字符串被拒绝
  - label alias 可以满足 required
- `test/unit/recordInputWorkflowErrorBoundary.test.ts`
  - create/update 的 prepare 异常必须 resolve 为 `RecordSubmitResult`，不能 reject

扩展：

- `recordInputFacade.test.ts`
  - 空数组 required 语义
  - AI label → key 归一化
  - batch partial_success 汇总

## 5. 验证结果

已执行的源码级验证：

- 修改文件 TypeScript transpile/语法诊断：PASS
- `scripts/gates/records-gate.mjs`：PASS
- `scripts/gates/ui-runtime-gate.mjs`：PASS
- architecture public API / capability / AST / feature / DI / dual-system checks：PASS
- explicit-any budget：PASS（修复版 src `409/501`、test `154/165`）
- TSX >= 350 行预算：恢复为 `0/1`，未新增大 TSX 候选

仓库完整 `architecture/quality` gate 仍会在 `TS-like files >= 450 lines: 1 > 0` 上失败；对原始上传包执行相同 gate 也会在完全相同指标失败，因此这是已有基线问题，不是本修复引入。

### 当前环境无法完成的验证

上传的是 source-only 包，没有 `node_modules`/已构建 bundle。尝试 `npm ci` 时依赖获取在当前执行环境超时，因此：

- Jest 无法真正启动（`jest: not found`）
- `tsc -p tsconfig.json` 会因缺少 `@types/node`、`preact`、`vite/client` 类型而停止
- 无法在这里产出可信的 `main.js/styles.css` release bundle

因此本包交付的是**已经修复并经过源码门禁检查的完整源码**，没有伪造“构建成功”。在有正常 npm registry/依赖缓存的本地或 CI 中建议执行：

```bash
npm ci
npm run typecheck
npm test -- --runTestsByPath \
  test/unit/aiBatchConfirmFooter.test.tsx \
  test/unit/aiBatchConfirmModel.test.ts \
  test/unit/recordInputFacade.test.ts \
  test/unit/recordInputValidation.test.ts \
  test/unit/recordInputWorkflowErrorBoundary.test.ts --runInBand
npm run build
```

## 6. 预期行为

修复后：

1. 桌面端点击“保存此条/保存全部”会在 pointer 阶段立即进入提交，不再依赖易被失焦重渲染影响的 click。
2. 按钮立即显示“保存中…”并禁止重复提交。
3. 成功后明确显示“第 N 条已保存”，并标记记录为已保存。
4. 必填缺失、模板异常、冲突、取消、未知异常都会有可见提示，不再静默。
5. 只有 RecordInput 工作流确认写入并重新扫描到 Record ID 后才会返回 create success。
6. 后续故障可以通过同一个 `[AiInput][traceId]` 从 AI 解析一路追到保存结果。
