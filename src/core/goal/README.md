# Goal / Period / Record 最小领域契约

本目录只放“目标闭环”的核心类型合同，不做 UI、不做 Obsidian 写入、不替换现有 Item / Block / View 主链。

当前定位：

- Goal：长期目标或阶段性目标。
- Period：由记录预设 `periodPolicy` 和记录日期运行时推导出的周、月、季度或年度周期。
- Record：当前系统已有 Item / Block 记录，通过 `goalPath / goalId / coreBlock / period.*` 等字段与目标关联。

设计约束：

1. `core/goal` 只能依赖纯 TypeScript 类型。
2. 外层只能通过 `@core/public` 使用这些类型。
3. 单人版不再维护手动 Cycle 表或显式 GoalRecordRelation 表。
4. QuickInput / Statistics / Retrieval 直接从当前记录字段和目标预设推导目标上下文。
