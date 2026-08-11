# Think OS — Phase 1 Record Foundation v2 实施报告

基线：1.0.35  
范围：稳定 Record ID、统一 Record Codec、RecordIndex、统一 Locator/Mutation、Task v2 创建与读取。  
明确不做：Series/recurrence lifecycle、TaskSession、Energy consumer migration、Views/Field System 全量迁移、旧代码物理删除。

## 已落地

### 1. Stable Record ID

新增 `src/core/records/RecordId.ts`：

- `RECORD_SCHEMA_VERSION = 2`
- Record ID 在首次真正写入前生成；
- `task.<ULID-like>` / `rec.<ULID-like>` 等可诊断前缀；
- 业务类型不依赖 ID 前缀；
- Scanner 不再生成 `${path}#${line}` 业务 ID。

### 2. Unified MarkdownRecordCodec

新增 `MarkdownRecordCodec.ts`，主链 codec 只处理 Record Block：

```md
<!-- start -->
记录ID:: ...
记录版本:: 2
核心Block:: ...
...
<!-- end -->
```

Task v2 也是普通 Record Block。`codec/index.ts` 不再导出 MarkdownTaskCodec/MarkdownBlockCodec 双入口。

### 3. Scanner cutover

`DataStoreFileScanner`：

- 删除主扫描路径中的 `parseTaskLine()`；
- 不再逐行尝试 Task parser；
- 只扫描 `<!-- start --> ... <!-- end -->`；
- 缺 stable ID / 非 v2 envelope 的 Record 被隔离并记录 integrity issue；
- legacy checkbox Task Line 不会进入 DataStore。

### 4. RecordIndex

新增 `RecordIndex.ts`：

```text
recordId -> current location(s)
```

- file move / line move 只改变 location；
- duplicate ID 不选择“最近行”，而是从可变更集合中隔离；
- `DataStoreIndex` 不再通过 ID 前缀判断某条记录属于哪个文件。

### 5. Cache v7

cache schema 从 6 bump 到 7：

- 缓存 stable ID / schemaVersion / coreBlock / source range / type projection；
- 删除 warm-start `type: 'task'` 默认恢复；
- 旧 cache 直接失效，不写兼容转换器。

### 6. ID-based Locator / Mutation

`resolveRecordBlockRangeById()` 是新主 mutation locator：

- expected line 仅为 fast-path hint；
- 必须在 Block 内验证同一个 `记录ID`；
- 文件内 duplicate ID 直接 conflict；
- InputService update/delete 不再通过 `item.type` 分成 Task Line 与 Block 两套 mutation。

### 7. RecordRepository / transaction primitive

新增：

- `RecordRepository.ts`
- `RecordMutationTransaction.ts`

提供稳定 ID 的 create/get/update/delete 基础，以及写入前置检查 + best-effort rollback primitive。

### 8. Task v2 create/read

core.task 的 status options 改为 canonical：

```text
open / done / cancelled
```

OutputPlanner 对 Task 不再使用模板字符串生成 checkbox/date/repeat token，而是直接走 Record v2 encoder。即使 Goal Template 里残留旧 Task outputTemplate，Task writer 也不会把它当 Task storage grammar。

Task 新记录形态：

```md
<!-- start -->
记录ID:: task....
记录版本:: 2
核心Block:: task
状态:: open
内容:: ...
目标ID:: ...
目标:: ...
主题:: ...
创建于:: ...
计划日期:: ...
预计时长:: ...
<!-- end -->
```

`taskStatus` helper 先读取 explicit `item.status`，让尚未迁移的消费者能看到新 Task 的 open/done 状态；`type: task/block` 此阶段只作为消费者兼容投影，不再是 storage/parser 真源。

### 9. Create/edit/move identity preservation

- Create preview 先分配 ID，execute 复用同一 ID；
- 扫描后优先按 ID 找 created record，不再靠内容相似度猜；
- Edit 复用原 ID；
- Move transaction 写新位置时复用原 ID，再删除旧位置；
- `recordSnapshot` 不再从 ID 反解 path#line，也不再把 Task raw block 当 Task Line 剥正文。

## 刻意延后

- recurrence string 不迁移、不 fallback parse；Phase 2 才以 structured recurrence + TaskSeries 恢复；
- TaskCompletionMutation / mark.ts 仍是 legacy 文件，但新 Scanner/新 InputService 主链不再使用旧 Task parser；Phase 2 改 lifecycle，Phase 5 物理删除；
- Timer 的 checkbox open 判断未在本阶段扩大修改；Phase 3 统一处理；
- Energy / Views / Field System / AI Retrieval 仍通过临时 Task projection 消费；Phase 4 清零；
- Theme ID Foundation 不扩 scope。

## 验证

通过：

1. `npm run data-store:gate`
2. `npm run schema:gate`
3. `npm run task-foundation-v2:gate`（新增）
4. 改动文件 TypeScript 语法 transpile：21 个核心改动文件，0 syntax error。
5. 在无第三方 type package 的临时 tsc 环境中过滤外部 module error 后，改动文件 0 个内部 TS diagnostic。
6. Record ID + ID locator 运行时 smoke：stable task ID 生成成功，Record Block 按 ID 定位成功。

环境限制：上传源码不含可用 node_modules；`npm ci` 在当前沙箱超时并留下空依赖目录，因此无法诚实声称完成全项目 `npm run typecheck/test/build`。交付包已移除该临时 node_modules。完整依赖环境下必须在 Phase 1 merge 前补跑 full typecheck/test/build。

## 新增/修改文件

新增：

- `src/core/records/RecordId.ts`
- `src/core/records/RecordIndex.ts`
- `src/core/records/RecordRepository.ts`
- `src/core/records/RecordMutationTransaction.ts`
- `src/core/records/codec/MarkdownRecordCodec.ts`
- `scripts/gates/task-foundation-v2-gate.mjs`

同时修改 Foundation / DataStore / Input / workflows / core.task / cache / snapshot / tests 共 30+ 个文件。完整源码 ZIP 为本阶段交付真源，不只提供 patch。
