# Goal / Period / Record 最小领域契约

本目录只放“目标闭环”的核心类型合同，不做 UI、不做 Obsidian 写入、不替换现有 Item / Block / View 主链。

当前定位：

- Goal：长期目标或阶段性目标；它是独立实体层级，不是 Tag，也不使用 `#` 语法。
- Period：由记录预设 `periodPolicy` 和记录日期运行时推导出的周、月、季度或年度周期。
- Record：当前系统已有 Item / Block 记录，通过单值 `goalId` 关联目标；`goalPath` 只是可读快照，`coreBlock / period.*` 表示记录类型与周期。

设计约束：

1. `core/goal` 只能依赖纯 TypeScript 类型。
2. 外层只能通过 `@core/public` 使用这些类型。
3. 单人版不再维护手动 Cycle 表或显式 GoalRecordRelation 表。
4. `goalId` 是 Goal 身份真源；不得通过标签、`#` 字符串、`goalPath` 猜身份。
5. `goalPath` 只接受 `/` 分层文本；任何层级包含 `#` / `＃` 都视为非法。
6. QuickInput / Statistics / Retrieval 从当前 GoalDefinition + Record 的 `goalId` 推导目标上下文。
