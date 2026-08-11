# Think OS Task Data Foundation v2 — Phase 0/1 实施审计

基线：Think OS 1.0.35 Architecture Convergence  
审计输入：完整源码 ZIP + `THINK_OS_TASK_DATA_FOUNDATION_V2` 设计报告  
原则：Phase 0 只读；不为旧 Task Line 保留双 parser；中间开发版本允许局部能力暂时不可用，但不把双轨版本投入日常 Vault。

## 1. 结论

设计报告的主判断与真实源码一致：当前 Task 确实是第二套记录系统，身份、解析、创建、Mutation、recurrence、status、Timer/Energy 和消费者都存在 Task Line 特例。报告提出的 “Record Foundation v2 + Task Domain v2” 是正确切割方向。

源码实审将报告中的“约 36 个 src 文件”扩大为：

- **88 个源码文件**属于直接语义耦合或依赖传播影响面；
- **39 个测试文件**需要删除/重写/随领域迁移；
- 合计 **127 个真实文件**进入迁移清单。

完整逐文件清单见同批交付的 `think-os-phase0-affected-files.csv`，每行包含证据标签、删除/重写/保留/延后分类和目标 Phase。

## 2. 设计报告与真实源码的差异 / 补充风险

### 2.1 Cache warm-start 比报告写得更危险

`src/core/types/cache.ts` 的旧 `fromCachedItem()` 会把缓存条目默认恢复为 `type: 'task'`。这会造成 cold scan 与 warm start 的业务类型不一致。因此 cache schema bump 必须进入 Phase 1，而不是等消费者迁移。

### 2.2 DataStoreIndex 也把 path#line 当身份

`src/core/services/dataStore/DataStoreIndex.ts` 删除/替换文件记录时调用 `itemBelongsToFileId(it.id, filePath)`；后者依赖 `${path}#${line}` 前缀。稳定 Record ID 后，Index 不能再通过 ID 反推文件归属，必须维护 file -> records 和 recordId -> location 两个明确索引。

### 2.3 Create/Edit workflow 也依赖输出 grammar 与 line number

`src/app/usecases/recordInput/locator.ts` 会：

- 从 item id 反解 path#line；
- 用 line number 推断新记录；
- 从 `outputTemplate` 判断 task/block；
- 对 Task 使用 checkbox grammar 加分。

这不是 DataStore 内部问题，而是 Application workflow 也存在 location-as-identity。

### 2.4 RecordSnapshot 会从 Task rawSource 重新剥正文

`src/core/types/recordSnapshot.ts` 对 `item.type === 'task'` 再走 Task 行正文提取，并在缺 file location 时从 ID 反解 path#line。Task Block 化后这里会直接误读完整 Record Block，所以必须跟 Phase 1 主链一起处理。

### 2.5 Goal Template 可以重新引入旧 Task grammar

Goal Template 支持自定义 `outputTemplate`。如果 Task 创建仍然信任模板 Markdown，旧自定义模板可以继续输出 `- [ ]`。因此 Phase 1 的 Task 写入必须由 TaskDraft/Record Codec 决定，Task template 只提供字段/目标位置，不允许模板字符串重新成为 Task grammar 真源。

### 2.6 TimerService 还有 checkbox runtime 判断

除报告已指出的 TimerState 历史问题外，`src/features/timer/TimerService.ts` 还直接用 Task 内容的 checkbox regex 判断 open Task。它不应在 Phase 1 扩大修改，但必须明确列入 Phase 3，不可遗漏。

## 3. 文件分类

### 3.1 删除（最终物理删除）

- `src/core/records/codec/MarkdownTaskCodec.ts`
- `src/core/recordInput/mutation/TaskLinePatch.ts`
- `src/core/services/item/itemId.ts`
- `test/unit/taskLinePatch.test.ts`

说明：Phase 1 起它们不得再进入新主链；物理删除安排在 Phase 5，避免当前阶段把 Task Domain/Timer 等未迁移代码一次性拉爆。

### 3.2 Phase 1 重写（Foundation 主链）

核心：

- `src/core/types/schema.ts`
- `src/core/types/cache.ts`
- `src/core/types/recordSnapshot.ts`
- `src/core/records/RecordEntity.ts`
- `src/core/records/RecordNormalizer.ts`
- `src/core/records/codec/MarkdownBlockCodec.ts` → `MarkdownRecordCodec`
- `src/core/utils/parser.ts`
- `src/core/services/dataStore/DataStoreFileScanner.ts`
- `src/core/services/dataStore/DataStoreIndex.ts`
- `src/core/services/dataStore/DataStoreCache.ts`
- `src/core/services/DataStore.ts`
- `src/core/recordInput/mutationLocator.ts`
- `src/core/recordInput/snapshot/OutputPlanner.ts`
- `src/core/services/InputService.ts`
- `src/core/blocks/defaultCoreBlocks.ts`
- `src/app/usecases/recordInput/locator.ts`
- `src/app/usecases/recordInput/workflows/CreateRecordWorkflow.ts`
- `src/app/usecases/recordInput/workflows/UpdateRecordWorkflow.ts`
- `src/app/usecases/recordInput/workflows/RecordMigrationTransaction.ts`

Phase 1 测试重写：

- `test/unit/parser.test.ts`
- `test/integration/parserDataFlow.test.ts`
- `test/unit/fieldSemantics.test.ts`

### 3.3 保留（架构形态正确，暂不大改）

- `src/features/quickinput/modal/useQuickInputSubmit.ts`
- `src/features/quickinput/modal/useQuickInputOutputPlan.ts`
- `src/core/ai/AiNaturalLanguageRecordParser.ts`
- `src/core/types/ai-schema.ts`
- `src/features/aiinput/aiNaturalInputCommand.ts`
- `src/core/goal/types.ts`
- `src/features/settings/goalTemplates/model/GoalTemplateDraftModel.ts`

原因：QuickInput/AI Input 的高层输入已经基本结构化；真正错误的是后端 OutputPlanner/Template Markdown 落盘。Phase 1 在写入边界切断 Task grammar 即可，不重做 UI。

### 3.4 延后

**Phase 2 — Task Domain**：`records/task/*`、`TaskCompletionMutation`、`ItemLocator`、`ItemService`、`ActionService`、recurrence/status Field semantics 等。目标是 explicit status、TaskSeries/Instance、structured recurrence、生命周期命令。

**Phase 3 — Timer/Session**：`TimerService.ts`、`TimerStateService.ts`、`core/types/timer.ts`、`recommendationLearning.ts` 等。目标是 TimerRuntime 与 TaskSession 分离。

**Phase 4 — Consumer reconnect**：Field Registry/Resolver、View configs、Energy candidates/models、Table/Block/EventTimeline/Timeline、Goal overview、Search/Filter、AI Retrieval/Chat、Export、record edit consumers。

**Phase 5 — Legacy delete**：旧 codec/parser/patch/locator/regex/helpers/fixtures 物理清零。

**Phase 6 — Stabilization**：全项目 gate、large vault、rename/move/conflict、recovery、性能、full tests/build。

> 完整逐文件映射见 CSV；报告正文只列关键文件，避免 127 行列表遮蔽依赖关系。

## 4. 当前数据流

```text
QuickInput / AI Input / Goal Template
        |
        v
RecordInput normalize/validate
        |
        v
OutputPlanner + template.outputTemplate
        |
        +-----------------------------+
        |                             |
        v                             v
Task: buildTaskRenderTokens       Block template
- [ ] / - [x]                    <!-- start/end -->
emoji date / recurrence
        |                             |
        +-------------+---------------+
                      v
                 InputService
                      |
                      v
                 Markdown Vault
                      |
                      v
              DataStoreFileScanner
             /                    \
            v                      v
     parseTaskLine            parseBlockContent
     MarkdownTaskCodec        MarkdownBlockCodec
            |                      |
            +----------+-----------+
                       v
               RecordNormalizer / Item
        id = path#line; type=task|block
                       |
   +---------+---------+---------+---------+
   v         v         v         v         v
 Fields    Views    Search     Goal      AI/Energy
                       |
                       v
              Mutation / Timer completion
                       |
      parse item id -> path#line + fuzzy locator
                       |
        TaskLinePatch / markTaskDone / next line
```

## 5. 目标数据流

```text
QuickInput / AI Input / Goal Template
        |
        v
Structured RecordDraft / TaskDraft
        |
        v
Validation / TaskCreateUseCase
        |
        v
RecordRepository
        |
        +--> allocate stable Record ID before first write
        |
        v
MarkdownRecordCodec
        |
        v
Markdown Vault: Record Blocks only
        |
        v
DataStoreFileScanner (single parser)
        |
        v
RecordIndex
recordId -> { path, startLine, endLine, modified }
        |
        v
RecordItem / TaskRecord projection
        |
        v
Application / Domain helpers
        |
   +----+----+----+----+----+
   v         v         v     v
Views      Search     Goal   AI
                    Timer/Energy (later phases)

Mutation:
recordId -> RecordIndex -> verify block ID/range/version -> replace Record Block
```

依赖规则：

```text
UI -> Application -> Domain -> Record Foundation -> Vault Port
```

禁止：

```text
Domain -> Markdown Task grammar
View/VM -> raw Task Line
Mutation -> parse path#line identity
AI/QuickInput -> construct checkbox line
```

## 6. 本轮第一批安全落地边界

### 允许进入 Phase 1

1. universal `记录ID / 记录版本 / 核心Block`；
2. 稳定 ID 生成；
3. 单一 `MarkdownRecordCodec`；
4. Scanner 只读 Record Block；
5. `RecordIndex: recordId -> location`；
6. duplicate/malformed/missing ID diagnostics；
7. cache schema bump，旧 cache 直接失效；
8. ID-based block locator/mutation；
9. RecordRepository + generic mutation transaction primitive；
10. core.task 改为 Task v2 Block 写入；
11. QuickInput/AI/Goal Template 的 Task 写入统一经过同一 Task v2 writer；
12. Task v2 能创建、扫描、读取、按稳定 ID 编辑/删除/移动。

### 明确不在 Phase 1 做

- 不实现 TaskSeries / next occurrence；
- 不解析或兼容旧 recurrence 字符串；
- 不实现完整 Task 状态机/undo；
- 不建立 TaskSession；
- 不把 Energy learning 改到 Session；
- 不大改 Views/Field System/AI Retrieval；
- 不重做 Timer UX；
- 不实体化 Theme ID；
- 不保留旧 Task Line parser 作为 fallback。

因此 Phase 1 中 **recurring Task 创建能力允许暂时不可用**，直到 Phase 2 以 structured recurrence + Series 回归。这个中间版本是开发 alpha，不应直接用于日常 Vault。

## 7. 覆盖确认

| 区域 | 已审计入口 | Phase |
|---|---|---|
| QuickInput | editor field semantics、output plan、submit workflow | P1 写入边界；P4 consumer cleanup |
| AI Input | AiNaturalLanguageRecordParser、ai-schema、aiNaturalInputCommand | 高层保留；P1 统一 writer；P4 Retrieval/Chat |
| Field System | FieldRegistry、FieldValueResolver、TemplateFieldAdapter、domainFields | P2 status/recurrence；P4 canonical fields |
| Views | EnergyTaskList、Table、Block、EventTimeline、timeline-parser、filters | P4 |
| Search/Filter | itemFilter、Field resolver、view config | P4 |
| Goal | overview、goal template contracts | P4；Goal ID 继续为真源 |
| Theme | theme path consumer | 本轮不做 Theme Foundation；P4 必要接口 |
| Template | core.task、GoalTemplate custom output | P1 writer 截断 Markdown grammar |
| Timer | TimerService、TimerStateService、TimerRow、timer types | P3 |
| Energy | actionPolicy、recommendationCandidates、context/effects/patterns、recommendationLearning | P3/P4 |
| DataStore | DataStore、FileScanner、Cache、WarmStart | P1 |
| Index | DataStoreIndex、pathUtils | P1 stable index；P5 清旧 helper |
| Mutation | InputService、mutationLocator、ItemLocator、TaskCompletionMutation、TaskLinePatch | P1 record mutation；P2 task lifecycle；P5 legacy delete |
| Tests | parser/field/integration + 35 downstream fixtures | P1 基线重写；P2-P6 分域迁移 |

**结论：上述指定区域没有遗漏。**

## 8. Phase 顺序（按本轮用户要求锁定）

- Phase 0：源码影响审计，只读。
- Phase 1：Record Foundation + Task v2 create/read。
- Phase 2：Task Domain（Status / Series / Instance / Recurrence / lifecycle）。
- Phase 3：TimerRuntime / TaskSession。
- Phase 4：Energy / Views / AI / Field System / Search / Goal consumers 全部接回新模型。
- Phase 5：删除旧 Task Line 世界。
- Phase 6：全项目审计与稳定化。

与原设计报告相比，本执行顺序把“Task v2 create/read”前移到 Phase 1，但不把 recurrence/lifecycle 一起前移；这是为了尽早切断写入和读取 grammar，同时控制一次改动面。
