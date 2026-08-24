# AI 记录保存：副作用边界系统修复（2026-08-17）

## 结论

这次问题不是单一“保存按钮失效”。截图和源码共同暴露了两个主因、三个放大器：

1. **QuickInputEditor 的可复用控件 CSS 被错误绑定到 `.modal.think-quick-input-modal` 宿主。**
   AI 确认窗复用了 QuickInputEditor，但宿主是 `.think-ai-batch-confirm-modal`，因此记录类型、目标、状态、重复等 `SelectablePill` 虽然真实拥有 `is-selected / aria-pressed=true`，却没有对应选中态样式。截图中“工作”目标真实存在（同时显示“清空”），但看不到选中效果，正好印证此问题。
2. **AI 确认窗形成了编辑器状态反馈回路。**
   旧实现把 `QuickInputEditor.onStateChange` 立即写回父组件 records；父组件每次 render 又重新创建 `context`。而 QuickInputEditor 把 `[initialBlockId, context]` 的变化定义为 reset 语义，于是出现：
   `editor state -> parent setRecords -> new context -> editor reset -> onStateChange -> ...`。
   这会造成高频重置/重渲染、焦点和事件时序抖动，也会让“为了抢在 blur 前保存”的 pointer/mouse 特殊路径变得更加脆弱。

放大问题的三处副作用是：

- 上一版 AI footer 同时注册 `pointerdown + mousedown` 并 `preventDefault`，把业务提交和焦点/浏览器事件时序耦合在一起；
- 批量保存过程中执行 `setCurrentIndex(i)`，让正在挂载的编辑器在异步循环里反复切记录/reset；
- backdrop guard 注册捕获阶段 `touchstart/touchend` 并阻止默认行为，既产生 Chrome 的 non-passive warning，也扩大了 Modal 事件边界。

## 新的职责边界

### 1. QuickInputEditor 自己拥有草稿

AI Modal 不再把每个 `onStateChange` 写回父状态。最新编辑器状态只写入 `draftStateByRecordIdRef`：

- 输入过程：只更新 editor 本地 reducer + draft ref；
- 切换记录：把当前 draft 一次性 materialize 到 record，然后切换；
- 单条保存：先 materialize 最新 draft，再启动保存事务；
- 保存全部：一次性 materialize 所有已捕获 draft，再逐条提交。

因此 live draft 不会再反向改变 `initialBlockId/context`，切断 reset feedback loop。

### 2. context 是不可变初始化种子

`AiBatchConfirmRecordItem` 新增 `editorContext`。它在 AI 结果转 RecordItem 时创建一次，并在草稿编辑过程中保持引用稳定。

QuickInputEditor 现在使用：

- `initialBlockId={currentRecord.blockId}`
- `initialFormData={currentRecord.formData}`
- `context={currentRecord.editorContext}`
- `key={currentRecord.id}`

记录切换有明确的组件生命周期边界；同一记录的普通父级 render 不会因为新 context 对象导致 reset。

### 3. 保存副作用集中到一个 action controller

新增 `useAiBatchConfirmActions.ts`，统一拥有：

- 单条保存 / 保存全部 / 跳过 / 完成；
- synchronous pending gate，防双击和重复事务；
- `AbortController`，Modal unmount 时取消在途请求；
- latest draft materialization；
- `traceId` 日志；
- success / partial_success / error 的统一状态与 Notice；
- 保存进度；
- viewState `{records,currentIndex}` 的原子发布。

UI 组件只发动作，不再直接管理持久化副作用。

### 4. 恢复标准 click 语义

AI “保存此条 / 保存全部 / 跳过 / 完成”只使用 `onClick`。

已移除 AI Modal 上一版的：

- `onPointerDown` 提交；
- `onMouseDown` 提交；
- `preventDefault` 保焦点提交；
- pointer/mouse 双路径去重负担。

重复点击由事务状态 ref 阻止，而不是通过浏览器事件技巧阻止。

### 5. 批量保存不再驱动编辑器切页

`handleSaveAll` 不再在循环中 `setCurrentIndex(i)`。后台依次提交 records，但当前编辑器保持在用户正在看的条目。每条结果只发布保存进度，不触发记录切换/reset。

### 6. Backdrop guard 缩成真正的 backdrop 边界

只监听：

- `pointerdown`
- `click`

且只有 `event.target === event.currentTarget`（事件直接发生在 backdrop 本身）才取消关闭。

来自 modal descendants（包括保存按钮）的事件永远不会被吞。移除了 scroll-blocking `touchstart/touchend` 捕获监听。

## 选中态修复

QuickInputEditor 的样式从“QuickInput Modal 私有覆盖”拆回组件 feature 层：

- `src/styles/features/quick-input-editor.css`：编辑器布局；
- `src/styles/features/quick-input-editor-controls.css`：输入、标签、pill、目标选择等可复用控件；
- `src/styles/overrides/quick-input-modal.css`：只保留 Obsidian QuickInput Modal 宿主几何和 footer/recovery 行为。

`SelectablePill` 的选中态同时命中：

- `.is-selected`
- `[aria-pressed="true"]`

并使用明确 accent border + accent text + selection surface。AI Modal、普通 QuickInput 以及以后任何复用 QuickInputEditor 的 surface 都能得到相同视觉语义。

## 用户可感知变化

- “工作”等已选目标现在应有清晰 accent 选中边框/文字；
- 当前记录类型、状态、重复等单选 pill 同样有选中态；
- 点击“保存此条”后 footer 立即显示“正在保存第 N 条…”；
- 保存按钮进入 loading/disabled，重复点击不会启动第二个事务；
- 成功显示“第 N 条已保存”，失败显示明确错误；
- 已保存/已跳过记录的编辑器锁定，避免出现改了却没有保存入口的状态；
- “保存全部”显示逐条进度，但不会强制 UI 跳来跳去；
- 关闭 Modal 会 abort 在途提交，不再让 unmounted UI 接收后续状态更新。

## 修改文件

核心：

- `src/platform/obsidian/modals/AiBatchConfirmModal.tsx`
- `src/platform/obsidian/modals/useAiBatchConfirmActions.ts`（新增）
- `src/platform/obsidian/modals/AiBatchConfirmModel.ts`
- `src/platform/obsidian/modals/AiBatchConfirmFooter.tsx`
- `src/platform/obsidian/modals/AiBatchConfirmSidebar.tsx`
- `src/platform/obsidian/modals/modalBackdropGuard.ts`

样式：

- `src/styles/features/quick-input-editor.css`
- `src/styles/features/quick-input-editor-controls.css`（新增）
- `src/styles/features/overlay-ui.css`
- `src/styles/overrides/quick-input-modal.css`
- `src/styles/main.css`

回归测试：

- `test/unit/aiBatchConfirmFooter.test.tsx`
- `test/unit/aiBatchConfirmModel.test.ts`
- `test/unit/aiBatchConfirmSideEffectBoundary.test.ts`（新增）
- `test/unit/modalBackdropGuard.test.ts`（新增）
- `test/unit/quickInputEditorCssOwnership.test.ts`（新增）

## 回归保护点

新增/扩展测试覆盖：

1. AI footer 只有 native click 保存路径；mousedown 不提交；
2. busy 时保存 disabled，并有 aria-live transaction status；
3. `editorContext` 保持不可变引用，draft 只在 materialize 时写回；
4. pending lookup 支持环回下一条；
5. AbortSignal 贯穿 AI create submit；
6. backdrop descendant pointer event 不会被取消；直接 backdrop gesture 才被 guard；
7. QuickInputEditor selected CSS 不依赖 `.think-quick-input-modal`；
8. AI Modal 不再把 live state 写回 initialization props；
9. AI footer/sidebar 无 pointerdown/mousedown 提交；
10. save-all controller 内没有通过 `setCurrentIndex(i)` 驱动编辑器切换。

## 验证结果

通过：

- `node scripts/gates/records-gate.mjs`
- `node scripts/gates/ui-runtime-gate.mjs`
- `node scripts/gates/energy-gate.mjs`
- `node scripts/gates/goal-only-gate.mjs`
- TypeScript `transpileModule` 对本次修改的 TS/TSX 与新增测试逐文件语法诊断：全部 PASS。

质量 / architecture gate 只剩与上一版源码完全一致的历史基线：

- `src/core/records/codec/MarkdownRecordCodec.ts` 451 行，使 `TS-like files >= 450` 为 1，而预算是 0。

本次一度因为移动 CSS 让 `quick-input-editor.css` 超过 480 行，已进一步拆成 layout + controls 两个 feature CSS；该新增回归已消除。

以下 gate 的失败也已在上一版源码对照复现，与本次改动无关：

- product/stability：source-only 包缺 `.github/workflows/ci.yml`；
- task/stability：仓库要求 `CURRENT_CACHE_SCHEMA_VERSION = 14`，当前源码基线未满足。

## 当前环境限制

尝试 `npm ci --ignore-scripts --no-audit --no-fund` 时依赖获取没有完整结束，因此本环境无法诚实宣称执行了 Jest / 完整 `tsc -p` / Vite build。未完成的 `node_modules` 已从交付目录清理，不会污染源码包。

在有正常 npm registry/cache 的本地或 CI 上建议执行：

```bash
npm ci
npm run typecheck
npm test -- --runTestsByPath \
  test/unit/aiBatchConfirmFooter.test.tsx \
  test/unit/aiBatchConfirmModel.test.ts \
  test/unit/aiBatchConfirmSideEffectBoundary.test.ts \
  test/unit/modalBackdropGuard.test.ts \
  test/unit/quickInputEditorCssOwnership.test.ts
npm run gate:records
npm run gate:ui-runtime
npm run build
```

## 这次修复的长期约束

后续修改 AI 确认窗时应保持：

- **live draft 不进入父级 render feedback loop**；
- **initialization props 不是持续同步通道**；
- **业务保存不绑定 pointer/mouse/blur 时序技巧**；
- **批量副作用不驱动当前编辑器导航**；
- **可复用组件样式不得绑到单一宿主 Modal**；
- **backdrop guard 只拥有 backdrop，不拥有 descendant interaction**；
- **每个保存动作必须有立即可见的 pending/success/error 状态**。
