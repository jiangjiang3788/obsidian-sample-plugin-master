# Think OS 记录输入 × 视图展示完整回归矩阵

> 基线：v1.0.65（2026-08-24）
> 目标：任何 Record 输入、保存、解析、展示逻辑发生修改时，都能知道必须回归哪些链路。
> 原则：**输入成功不等于功能成功**。一个记录只有完成“输入 → 持久化 → DataStore 可读 → 视图可见 → 编辑/删除后同步”才算闭环。
> 上下文专项：时间轴/热力图/统计/Goal/编辑入口的完整上下文契约见 `docs/testing/CONTEXT_REGRESSION.md`。

---

## 1. 本轮必须守住的产品契约

### 1.1 用户可创建的 9 种 Record

| RecordType | 中文语义 | 创建模式 | 文件 | Goal 要求 | GoalTemplate 要求 | 关键特殊规则 |
|---|---|---|---|---|---|---|
| `core.task` | 任务 | template | `01/目标.md` | 必须 | 必须有直接启用模板 | 时间、时长、优先级、精力需求、重复规则 |
| `core.habit` | 打卡 | template | `01/目标打卡.md` | 必须 | 必须有直接启用模板 | 日期、评分、图标 |
| `core.plan` | 计划 | template | `01/目标计划.md` | 必须 | 必须有直接启用模板 | 周期按“周”派生 |
| `core.review` | 总结 | template | `01/目标总结.md` | 必须 | 必须有直接启用模板 | 周期按“周”派生 |
| `core.thought` | 思考 | template | `01/目标思考.md` | 必须 | 必须有直接启用模板 | 日期、内容、图标 |
| `core.event` | 事件 | template | `01/目标事件.md` | 必须 | 必须有直接启用模板 | 日期、内容、图标 |
| `core.blocker` | 阻碍 | template | `01/目标阻碍.md` | 必须 | 必须有直接启用模板 | 日期、内容、图标 |
| `core.milestone` | 里程碑 | template | `01/目标里程碑.md` | 必须 | 必须有直接启用模板 | 日期、内容、图标 |
| `core.energy` | 精力 | **direct** | `01/目标精力.md` | **必须** | **不需要/不得依赖** | 快捷/详细、实时/补录 |

所有记录默认追加到：`## {{goalPath}}`。

### 1.2 这次发现并修复的 Energy 契约破坏

旧行为存在两层冲突：

1. Energy 是 `direct` 类型，本来没有 GoalTemplate；但 QuickInput 创建态把它当成“必须有直接 GoalTemplate”的类型筛选 Goal，导致 Goal 列表可能变成空数组。
2. 设置文案和 UseCase 规定“默认目标为空 = 自动选择第一个活跃 Goal”，但桌面 QuickInput helper 在默认目标为空时返回 `null`。

结果：`EnergyQuickCapturePanel.canCapture === false`，20/40/60/80/100 按钮全部禁用，用户表现就是“精力不能记录”。

修复后的唯一规则：

- Energy 创建：显示所有非 archived、未被显式禁用的可用 Goal；**不要求 GoalTemplate**。
- 有有效 `energySettings.defaultGoalPath`：优先选它。
- 默认路径为空或已失效：选第一个 `active` Goal；没有 active 时再退到第一个可用 Goal。
- 没有任何可用 Goal：禁止记录，这是正确保护行为。
- 普通 template Record 创建仍然必须满足直接 GoalTemplate，不因 Energy 修复而放宽。

---

## 2. 自动测试分层

### L0 — 注册表/契约测试（P0）

目的：防止 RecordType 或 View 被重命名、字段删掉、captureMode 改错、target file 漂移而没有任何报警。

测试：`test/unit/recordCaptureSurfaceMatrix.test.ts`

覆盖：

- 9 个用户 RecordType 是否完整。
- captureMode 是否正确。
- target file / append header 是否正确。
- 是否 userVisible / goalBindable。
- 每种类型的字段 ID 集合。
- Energy 必须 direct 且不能进入 `DEFAULT_TEMPLATE_RECORD_TYPES`。
- Plan/Review 的 week period policy。

### L1 — 输入 UI 行为测试（P0）

测试：`test/unit/quickInputRecordTypeEligibilityMatrix.test.ts`、`test/unit/energyQuickCapturePanel.test.tsx`

当前新增 Energy P0：

- 默认 Goal 为空时自动选第一个 active Goal。
- 自动选择后快捷评分按钮可用。
- 点击 80 正确生成 `scoreMode=quick, score=80, goalPath, captureMode=realtime`。
- 配置显式默认 Goal 时优先使用配置。
- Energy create 明确不要求直接 GoalTemplate；普通 create 仍然要求。
- 没有任何 GoalTemplate 时，Energy 仍能得到 active/paused 非归档 Goal。

后续每个 Record 的输入组件都应补同等级测试：

- 最小合法输入能提交。
- 必填字段缺失不能提交且有明确提示。
- option/multiSelect/rating/boolean/datetime 的 UI 值能转为正确 formData。
- Goal 切换后 Goal 上下文字段同步。
- 切 RecordType 不遗留不兼容字段。
- create/edit/convert/duplicate 各模式不串状态。

### L2 — 持久化往返测试（P0）

测试：`test/integration/recordTypePersistenceMatrix.test.ts`

对 8 个 template Record：

`RecordType schema → formData → buildRecordOutputPlan → Markdown → parseRecordBlock → RecordViewItem`

对 Energy：

`Energy request → buildEnergySnapshotMarkdown → Markdown → parseRecordBlock → RecordViewItem`

必须断言：

- `recordType`
- `goalPath`
- `content`
- target file / target header
- Task 的 status/startAt/endAt/expectedDuration
- Habit rating
- Energy date/time/score/brain/physical/scoreMode/captureMode/timePrecision

### L3 — View 注册/共同查询测试（P0）

测试：`test/unit/viewSurfaceMatrix.test.ts`、`test/unit/viewRecordTypeCompatibilityMatrix.test.ts`

覆盖：

- 9 个 View 在 core registry / runtime binding / settings editor 三处必须完全一致。
- label、headerCreate、export capability 不漂移。
- 共用 `queryViewBaseRecords()` 不得无故丢掉任意一种用户 Record。
- 9 种 Record 混合输入时，通用 View 保留全部；Timeline 只投影 Task；Heatmap/Statistics/EventTimeline 按各自语义处理；Progress 把 Energy 分离；EnergyView 只把 Energy 当主样本。

### L4 — 各 View 语义单测（P1）

项目已有以下测试，应与本矩阵一起跑：

- `blockViewModel.test.ts`
- `tableViewModel.test.ts`
- `excelViewModels.test.ts`
- `timelineViewModel.test.ts`
- `eventTimelineViewModel.test.ts`
- `statisticsViewModel.test.ts`
- `heatmapViewModel.test.ts`
- `progressViewModel.test.ts`
- `energyViewModel.test.ts`
- `energyRecordViewSemantics.test.ts`

### L5 — Obsidian 真机 E2E（P0/P1）

自动 parser/model 测试无法替代真实 Obsidian 的 Vault 写入、刷新、Modal 状态和点击交互。发布前必须按第 6 节执行一次真机闭环。

---

## 3. 每种记录类型输入测试矩阵

符号：`P0` = 保存链路阻断；`P1` = 数据正确性/交互核心；`P2` = 次要呈现。

### 3.1 Task / 任务

字段契约：

- `core.task.status`
- `core.task.content`
- `core.task.recurrenceUnit`
- `core.task.recurrenceInterval`
- `core.task.startAt`
- `core.task.endAt`
- `core.task.expectedDurationMinutes`
- `core.task.priority`
- `core.task.energyDemand`
- `core.task.brainDemand`
- `core.task.physicalDemand`
- `core.task.availabilityContexts`
- `core.task.recoveryIntent`

必测：

- [ ] P0 最小任务可保存并重新解析。
- [ ] P0 Goal 没有直接启用 Task GoalTemplate 时，创建表单不可伪造默认模板。
- [ ] P1 startAt/endAt 往返不丢日期和分钟。
- [ ] P1 expectedDurationMinutes 与时间区间一致性。
- [ ] P1 status open/completed 往返。
- [ ] P1 recurrence=none 不生成 task-series；重复任务按既有 Task domain 契约执行。
- [ ] P1 priority / energyDemand / brainDemand / physicalDemand 不串字段。
- [ ] P1 availabilityContexts multiSelect 往返。
- [ ] P1 Timer 创建出的 task-session 能关联 Task，但不会把 task-session 当成用户新 RecordType。

### 3.2 Habit / 打卡

- [ ] P0 content/date/rating/icon 保存并解析。
- [ ] P1 rating 典型值与边界值均不变形。
- [ ] P1 Heatmap 默认使用场景可见。
- [ ] P1 同一天多次记录时计数/展示符合当前产品定义。

### 3.3 Plan / 计划

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 date 改变时 week period 自动重新派生。
- [ ] P1 跨周、跨月、跨年周边界正确。

### 3.4 Review / 总结

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 week period 派生规则与 Plan 一致。
- [ ] P1 修改日期后 period 不残留旧周。

### 3.5 Thought / 思考

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 EventTimeline 在配置 date 字段时可读取。
- [ ] P1 Progress 的 goal 证据聚合不误排除。

### 3.6 Evidence / 事件

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 EventTimeline 正确按日期排序。
- [ ] P1 Progress 能作为非 Energy 进展证据。

### 3.7 Blocker / 阻碍

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 通用 View 不因语义为 blocker 而漏记录。
- [ ] P1 日期过滤边界正确。

### 3.8 Milestone / 里程碑

- [ ] P0 content/date/icon 保存并解析。
- [ ] P1 EventTimeline/Progress 在符合配置时可展示。
- [ ] P1 日期排序、Goal 分组正确。

### 3.9 Energy / 精力

- [ ] **P0 没有任何 Energy GoalTemplate 时，仍能列出非 archived Goal。**
- [ ] **P0 默认 Goal 为空时，自动选择第一个 active Goal。**
- [ ] P0 默认 Goal 指向已删除/不可用 Goal 时，回退到 active Goal。
- [ ] P0 没有任何 Goal 时按钮禁用且不能写无 Goal 的 Energy。
- [ ] P0 快捷 20 / 40 / 60 / 80 / 100 五档都可保存。
- [ ] P0 详细模式 brain/physical 可保存，综合分正确。
- [ ] P0 实时模式自动使用当前 date/time。
- [ ] P0 补录模式必须同时有 date + exact time。
- [ ] P1 补录日期不能选择未来日期。
- [ ] P1 score/captureMode/timePrecision 往返 parser 不丢。
- [ ] P1 保存成功后 `01/目标精力.md` 有目标标题和稳定 Record block。
- [ ] P1 DataStore 刷新后 EnergyView 立即出现新样本。
- [ ] P1 ProgressView 的 Energy summary 能读取，但 Energy 不被当普通 progress item 计数。

---

## 4. 9 个 View 的“应该展示什么”矩阵

这里区分“通用数据源允许”与“专用 View 的产品语义”，避免错误地要求所有 View 都展示全部类型。

| View | 主要 Record 语义 | 当前代码应测试的核心 |
|---|---|---|
| BlockView | 通用 | 9 种用户 Record 经公共 query 后都不能被类型级硬过滤；最终受用户 filter/config 控制 |
| TableView | 通用 | 同上；列值/空值/排序/编辑入口 |
| ExcelView | 通用 | 同上；动态字段、表格单元值、导出 |
| TimelineView | **Task 专用** | 用户类型只展示 Task；task-session 作为 Task 时间证据/关联数据，不把 Habit/Energy 等塞进任务时间轴 |
| StatisticsView | 聚合 | 按配置对输入数据做统计；类型过滤必须来自显式 config/query，而不是隐藏硬编码 |
| HeatmapView | 日期/Goal 热力图，Habit 是默认语义 | dated + goal-bound 记录的聚合；Habit preset/创建路径重点测试 |
| EventTimelineView | 日期事件 | 只要配置的时间字段有效即可进入；无有效日期的记录必须稳定排除 |
| ProgressView | Goal 成长 | 非 Energy 用户记录作为 progress items；Energy 单独进入 energy summary |
| EnergyView | **Energy 专用** | Energy 是主样本；Task/task-session 可作为推荐/上下文证据，不能把其它记录伪装成 Energy 样本 |

> 重要：如果产品未来决定“某 View 只允许某 RecordType”，应在本表先改产品契约，再改代码和测试。不要直接在组件里加一个 `if (recordType !== ...) return`。

---

## 5. 每个 View 必须重复的展示测试

对任何一个 View 改动，至少回归：

- [ ] P0 有数据时能渲染，不 crash。
- [ ] P0 空数据有稳定空态。
- [ ] P0 filter 不应泄漏被排除记录。
- [ ] P1 Goal filter/path 使用 canonical Goal path。
- [ ] P1 日期边界：开始日、结束日都正确包含/排除。
- [ ] P1 切换 年/季/月/周/天 时不重复、不凭空丢失。
- [ ] P1 排序稳定；同时间记录有稳定次序。
- [ ] P1 点击记录可进入编辑；Ctrl/⌘ 点击可按既有契约打开 origin。
- [ ] P1 编辑后 View 反映新值，不保留旧副本。
- [ ] P1 删除后 View 消失，不留 ghost item。
- [ ] P1 export 输出与当前过滤后的可见数据一致。
- [ ] P2 长内容、空内容、emoji/icon、中文 Goal path 不破布局。

专用 View 追加：

### TimelineView
- [ ] Task start/end/duration 的排列。
- [ ] 跨日任务。
- [ ] task-session 关联与孤儿 session 行为。
- [ ] 非 Task 用户 Record 不误入。

### HeatmapView
- [ ] 无记录日和有记录日差异。
- [ ] Habit rating/计数语义。
- [ ] 跨月/跨年日期格稳定。

### EventTimelineView
- [ ] 配置的时间字段缺失/非法时过滤稳定。
- [ ] 同日多记录排序。

### ProgressView
- [ ] 非 Energy 记录进入 progressItems。
- [ ] Energy 不进入普通 progressItems。
- [ ] Energy summary 正确。

### EnergyView
- [ ] 日视图水平时间轴。
- [ ] 周/月 date × time。
- [ ] 季/年每日点聚合。
- [ ] 缺失日期不伪造 0 分。
- [ ] 快捷与详细记录同时存在。
- [ ] realtime 与 retrospective 区分。

---

## 6. 发布前真机 Obsidian 闭环清单

对 9 种 Record **逐个执行**以下步骤。不要只看弹出“保存成功”。

### A. Create

1. [ ] 打开 QuickInput。
2. [ ] 切到目标 RecordType。
3. [ ] 选择 Goal。
4. [ ] template Record：验证只能选择有直接启用 GoalTemplate 的创建目标/路径。
5. [ ] Energy：验证即使没有 Energy GoalTemplate 仍有可用 Goal。
6. [ ] 填最小合法字段并保存。
7. [ ] 再填所有可选字段保存一条。
8. [ ] 保存失败场景必须留在 Modal 内并显示原因。

### B. Persistence

9. [ ] 打开对应 Markdown target file。
10. [ ] 检查落在 `## <goalPath>` 下。
11. [ ] 检查 stable id / recordType / 关键字段都存在。
12. [ ] 关闭再重开 Obsidian 后仍能被解析。

### C. Generic Views

13. [ ] BlockView 能按预期找到。
14. [ ] TableView 能按预期找到。
15. [ ] ExcelView 能按预期找到。
16. [ ] 搜索关键词能命中。
17. [ ] Goal filter 能命中/排除。
18. [ ] 日期 filter 能命中/排除。

### D. Specialized Views

19. [ ] 按第 4 节矩阵检查该类型相关专用 View。
20. [ ] 专用 View 不应显示“属于其它语义”的假数据。

### E. Edit / Delete

21. [ ] 从 View 打开编辑。
22. [ ] 修改 content/date/专属字段并保存。
23. [ ] Markdown 原块被正确更新，不产生重复块。
24. [ ] 所有相关 View 刷新成新值。
25. [ ] 删除记录。
26. [ ] Markdown 块消失。
27. [ ] 所有相关 View 都不再出现。

Energy 额外闭环：

28. [ ] 快捷 20/40/60/80/100 各存一条。
29. [ ] 详细模式存一条 brain/physical 不同分数。
30. [ ] 补录昨日具体时间一条。
31. [ ] EnergyView 的日/周/月/季/年都切一遍。
32. [ ] ProgressView Energy summary 同步更新。

---

## 7. 推荐的自动回归命令

依赖完整时：

```bash
npm ci
npm test -- --runInBand
npm run test:integration -- --runInBand
npm run check
npm run test:e2e
```

本次新增/修改的最小 P0 集：

```bash
npm test -- --runInBand --runTestsByPath \
  test/unit/recordCaptureSurfaceMatrix.test.ts \
  test/unit/quickInputRecordTypeEligibilityMatrix.test.ts \
  test/unit/energyRecordViewSemantics.test.ts \
  test/unit/energyQuickCapturePanel.test.tsx \
  test/unit/viewSurfaceMatrix.test.ts \
  test/unit/viewRecordTypeCompatibilityMatrix.test.ts \
  test/integration/recordTypePersistenceMatrix.test.ts
```

若只改 Energy：

```bash
npm test -- --runInBand --runTestsByPath \
  test/unit/energyRecordViewSemantics.test.ts \
  test/unit/energyQuickCapturePanel.test.tsx \
  test/unit/energyViewModel.test.ts
node scripts/gates/energy-gate.mjs
node scripts/gates/records-gate.mjs
node scripts/gates/ui-runtime-gate.mjs
```

---

## 8. 本轮验证状态（2026-08-24）

### 已实际执行并通过

- `node scripts/gates/energy-gate.mjs` ✅
- `node scripts/gates/records-gate.mjs` ✅
- `node scripts/gates/ui-runtime-gate.mjs` ✅
- `node scripts/gates/task-session-gate.mjs` ✅
- `node scripts/gates/architecture-gate.mjs` ✅
- `node scripts/gates/quality-gate.mjs` ✅

### 尚未能实际执行

Jest / TypeScript dependency-based suite：当前解压副本没有 `node_modules`，`jest` 不存在；尝试 `npm ci --ignore-scripts` 在当前执行环境超时。因此新增 Jest 用例是**已写入、待依赖环境执行**，不能把它们表述为“已通过”。

### 与本次业务修改无关的现有 Gate 失败

- `product-gate`：副本缺 `.github/workflows/ci.yml`，并提示 README release acceptance 内容不足。
- `stability-gate`：同样因 `.github/workflows/ci.yml` 缺失而失败。

这两个失败不是 Energy/Record/View 改动引入；但正式发布仓库仍应修复 CI 文件/发布治理后再宣称全绿。

---

## 9. 以后让 AI 改记录/视图时的固定协议

任何涉及 Record 输入或 View 的需求，先要求 AI 回答以下 6 项，再允许改代码：

1. 本次涉及哪些 RecordType？
2. 输入字段/schema/captureMode/GoalTemplate 规则是否变化？
3. Markdown 持久化/parser 是否变化？
4. 9 个 View 中哪些应受影响，哪些明确不应受影响？
5. 需要修改/新增本矩阵里的哪些测试？
6. 改完后实际跑了哪些测试/门，哪些因为环境原因没跑？

**禁止**只给“改好了”而不回答以上影响面。
