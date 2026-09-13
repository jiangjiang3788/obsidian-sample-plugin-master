# Think OS 1.5.0 Test Report

## 当前结论

1.5.0 仍是同一个版本，本轮属于 **release stabilization**，不拆 1.5.1/1.5.2，也不进入 1.6.0。

第一次在 Windows 完整依赖环境执行后，确认：

- production build 已成功；
- TypeScript 首轮有 10 个错误 / 4 个源码文件；
- Integration 首轮 60 个测试文件中 50 通过、10 失败，153 个用例中 129 通过、24 失败；
- Unit/Coverage 暴露了若干旧合同测试与 Whiteboard UI 测试问题；
- Coverage 当时由多个命令窗口并行执行，日志在运行中停止，没有形成最终 coverage 汇总，因此该次状态定义为 **INCOMPLETE/HUNG，不能记 PASS 或 FAIL**；
- `test:full` 首轮最终在 TypeScript typecheck gate 停止。

以上首轮问题已在本轮源码中逐项修复或校准；由于当前容器缺少完整 npm dependencies，Jest / semantic typecheck 的最终绿灯仍必须由完整依赖环境复跑确认。

## Windows 首轮结果

| 检查 | 首轮结果 | 本轮处理 |
|---|---|---|
| `npm run build` | PASS；Vite production build 完成 | 保持 |
| `npm run typecheck` | FAIL；10 errors / 4 files | 10 个已逐项修复；待 Windows 真跑确认 |
| Unit | FAIL | 已按失败文件逐项修复旧合同、UI harness 与真实行为问题；待真跑确认 |
| Integration | 50/60 文件通过；129/153 用例通过 | 已处理首轮 10 个失败文件；待真跑确认 |
| Coverage | INCOMPLETE/HUNG | 不再误记为失败完成；建议单窗口串行复跑 |
| `test:full` | FAIL at typecheck | typecheck 首轮错误已修；待完整链复跑 |
| `npm run gate` | PASS | 当前工作树复跑仍 PASS |
| P2 strict test-system audit | PASS | 当前工作树复跑仍 PASS |
| test syntax audit | PASS | 当前工作树复跑仍 PASS |

## TypeScript 首轮 10 个错误修复

### `src/app/usecases/goal.usecase.ts`

3 个 `draft.goalSettings` possibly undefined：先用 `ensureGoalSettings` 得到局部强类型 `goalSettings`，再写回 draft，后续 reduce/lookup 全部使用局部值。

### `src/core/goal/timePreset.ts`

`normalizeGoalPath()` 可能为 null：索引 revision preset 前先 canonicalize + guard。

### `src/core/services/GoalTemplateResolver.ts`

- 删除已经不属于 `RecordCaptureTemplate` 的 `granularity` legacy mutation；
- `fields` 按当前 required contract 处理，不再人为引入 `undefined`。

### Whiteboard annotation callbacks

`WhiteboardStore` mutation 返回 `Promise<boolean>`，UI callback contract 同步允许 boolean result，消除 `Promise<boolean>` → `Promise<void>` 的 4 个错误。

## 首轮失败测试的修复分类

### A. 1.5.0 新合同已正确，但测试仍是旧合同

已更新：

- Record Type Registry / Presentation / Capture Surface：加入 first-class `feeling`；
- feature registration：Whiteboard 是正式 feature；
- View Registry：当前正式 runtime View 数量为 10；
- AI / Quick Input fixture：`blocks` → `recordTypes`；
- GoalTemplate ID：使用 `core.task` / `core.thought` 等 canonical template IDs；
- Heatmap / AI Snapshot / Batch Confirm：使用当前 Record Type contract；
- Thought/Event/Feeling 测试按 1.5.0 schema 更新。

### B. 真实源码行为问题

已修：

- Whiteboard Workbench 重命名、Annotation 编辑、Edge Label 编辑：提交时直接读取当前 input/textarea DOM value，避免 Preact batching 导致提交旧 state；
- Whiteboard overview 卡片定位：删除旧卡片高度中心常量 `84`，统一使用当前 Card geometry；
- Markdown Export：Record Type 分组标题走 Record Type Presentation，因此 `thought` 输出为“思考”；
- Parser：非 Energy record 不再产生空 `recordSubtype` 属性；
- Timeline create context：恢复真正的时间块身份字段 `previousBlockId/nextBlockId`，撤销错误的机械 `RecordTypeId` 改名；
- AI runtime / ActionService：Record Type 集合与目标命名继续从 Block 语义收敛到 Record Type。

### C. Whiteboard JSDOM / Pointer 测试 harness

首轮多个 Whiteboard UI 用例使用普通 Event 模拟 pointer，不能稳定复现 PointerEvent contract。

已处理：

- setup 增加 PointerEvent polyfill；
- 增加统一 `createPointerEvent`；
- selection / semantic zoom / archive / annotation / workspace / nested workbench / timeline drag 等失败测试改用 PointerEvent；
- 异步 Store mutation 不再靠固定两三个 `Promise.resolve()` 猜刷新时机，关键失败测试改用 `waitForUi()` 等待实际状态/调用成立。

### D. Fault Lab Markdown 6 个失败

源码快照中的中文 fixture 文件名被错误保存为 `#Uxxxx` 形式，测试按正常中文文件名读取时会 ENOENT。

已恢复真实 UTF-8 中文文件名，内容不变。这是打包/文件名问题，不是 Markdown parser 语义失败。

### E. CSS Governance 假门禁

重新用冻结的 1.4.0 baseline 和当前 1.5.0 现场执行同一个 CSS audit：

```text
metric                         1.4.0    1.5.0    delta
cssFiles                       84       84       0
cssLines                       10319    10320    +1
important                      9        9        0
hardcodedColorsOutsideTokens   0        0        0
duplicateClassesAcrossFiles    93       93       0
sxOccurrences                  9        9        0
styleOccurrences               16       15       -1
```

旧测试读取了历史 `reports/css/css-audit-current.json`，所以 Windows 首轮显示 9596 行；旧上限 8500 / 72 files 本身也低于冻结基线，不能作为有效 release gate。

现在 CSS 单元测试直接现场执行 audit，不再依赖旧报告；预算按冻结基线锁定为 84 files / 10350 lines / 93 duplicate classes。新鲜 audit 下 CSS gate PASS。

### F. current data 测试与个人数据耦合

`currentSettingsGoalTaskDefaults` 等测试过去直接依赖仓库根 `data.json` 的个人状态（例如特定 Goal 是否存在、特定默认值）。这会让源码发布包不可移植。

已改为 inline current-schema fixture，验证真正的 seed / whitelist / idempotency 合同，不再把个人数据内容当产品测试合同。

## 当前环境已实际复跑并通过

### Aggregate gates

`npm run gate`：PASS

- product
- architecture
- records（12 Record schemas）
- task-session
- energy
- ui-runtime
- quality
- stability

### 测试体系 / 静态审计

- `npm run test:system:strict:p2`：PASS；P0 43/43、P1 72/72、P2 5/5 测试证据完整；
- `npm run test:syntax`：PASS；
- TypeScript parser 对 `src + test` 做 parse-level 检查：0 syntax diagnostics；
- `git diff --check`：PASS；
- migration idempotency：PASS。

这些结果证明架构/语法/治理与迁移当前一致，但**不替代 Windows 上的 semantic typecheck + Jest**。


## Windows 第二轮结果与当前取舍

第二轮稳定化包在 Windows 完整依赖环境执行后，结果显著收敛：

- `typecheck`：从首轮 10 errors / 4 files 降到 **2 errors / 2 files**；本工作树已修复 `GoalTemplateResolver.fields` 的 required contract，以及 `GoalTemplateMatrixRow` 的 `recordType` 残留变量。
- Integration：从首轮 50/60 文件通过提升到 **58/60 文件通过**，153 个用例中 **143 通过、10 失败**。
- 剩余 Integration 失败由两部分构成：`featureRegistrationComposition` 1 个、`aiRecordCaptureRuntimeMatrix` 9 个。前者已确认 Whiteboard 为 workspace 恢复前必须同步注册的 blocking feature，并已修正测试合同；后者属于 AI 专用路径。
- 用户当前明确不使用 AI，因此 AI runtime matrix 标记为 **DEFERRED / non-blocking for the non-AI 1.5.0 profile**，等实际启用 AI 时再继续修，不删除代码、不伪记 PASS。
- Unit / Coverage 仍主要被 Whiteboard Pointer/UI 长链拖慢；本轮继续修了当前 UI 合同、异步刷新等待，以及 Timeline pointer-up range fallback，但不再要求重型 Whiteboard UI 全量测试阻塞 Record Domain 1.5.0。

### 新增非 AI 核心验收入口

```bash
npm run test:1.5-core
```

该命令顺序执行：

1. `typecheck:src`；
2. 8 个 aggregate gates；
3. 1.5.0 核心 Unit（Record Type / Goal / Settings / Quick Input / Timeline / Migration-facing presentation）；
4. 1.5.0 核心 Integration（Settings/Goal/Timeline/Task restart/Repository/Migration/Markdown/DataStore）；

明确不包含 AI runtime matrix，也不包含 Whiteboard semantic zoom / nested pointer / archive pointer 等重型 UI 回归。

### 本轮新增的非 AI 可靠性修复

- Timeline block 拖动在 `pointerup` 时可以从最终坐标重建 logical range；即使宿主合并/漏发最后一帧 `pointermove`，仍可正确提交一次完整范围。
- Whiteboard feature registration contract：Dashboard 与 Whiteboard 均为 blocking；Settings / QuickInput / AIInput 为 background。
- Whiteboard Workbench 测试按当前真实右键菜单“移出工作台”合同验证，不回退旧的卡片内按钮。
- Whiteboard Archive / Selection / Semantic Layout / Semantic Zoom 等测试在 Preact 状态实际刷新后再断言，减少 JSDOM 假失败。
- Whiteboard Workspace `addRecord` 测试按当前显式 root `groupId = null` 合同验证，并等待 edge preview 状态再断言。

## Coverage 卡住的处理原则

首轮 Coverage 是多个测试命令窗口同时运行时出现的，没有最终汇总。`test:coverage` 本身是 271 个测试文件、`--runInBand` 加全量 src instrumentation，和其它 Jest/typecheck 同时跑会产生明显资源争用。

本轮不使用 `--forceExit` 掩盖潜在 open handle。下一次必须只开一个命令窗口，按顺序执行；如果仍停住，再以该单独运行的最后测试文件为依据启用 `--detectOpenHandles` 定点处理。

## 下一次完整依赖环境的唯一验收顺序

不要并行开多个测试窗口：

```bash
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:full
npm run build
```

完整发布档仍以全套测试为最高标准；但当前用户采用 **non-AI 1.5.0 profile** 时，先以 `npm run test:1.5-core` + `npm run build` 为主要验收线。AI runtime matrix 保持 DEFERRED，不记 PASS；Whiteboard 重型 Pointer/UI 全量回归单独维护，不再阻塞 Record Domain 主线。

## Windows non-AI core follow-up

A later Windows run of `npm run test:1.5-core` confirmed `typecheck:src` passed and the Product gate passed, then stopped inside `domain-convergence-gate`. The reported retired Category names were all inside `src/core/settings/currentSettingsSchema.ts`, where they are intentionally retained only as a one-shot retirement/sanitization whitelist.

The gate already intended to exempt this file, but compared a POSIX path literal (`src/core/settings/currentSettingsSchema.ts`) against Windows `path.join()` output (`src\core\settings\currentSettingsSchema.ts`). The exemption therefore failed only on Windows. The gate now canonicalizes scanned paths to `/` before exact-path exemptions. All aggregate gates pass after this cross-platform fix in the release worktree.

This was a gate false positive, not a runtime Category-domain regression. The release still requires one final Windows `npm run test:1.5-core` completion so the selected unit/integration suites execute after the gate.
