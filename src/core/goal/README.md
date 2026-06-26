# Goal / Cycle / Record 最小领域契约

本目录只放“目标闭环”的核心类型合同，不做 UI、不做 Obsidian 写入、不替换现有 Item / Block / View 主链。

当前定位：

- Goal：长期目标或阶段性目标。
- Cycle：目标的执行周期，例如周、月、季度或自定义周期。
- Record：当前系统已有 Item / Block 记录，可以通过关系表挂到目标或周期。
- Review：基于目标、周期、记录生成的复盘快照。

设计约束：

1. `core/goal` 只能依赖纯 TypeScript 类型。
2. 外层只能通过 `@core/public` 使用这些类型。
3. MVP 阶段只建立合同，不做旧数据迁移。
4. 现有 QuickInput / Timer / Statistics 可以先通过 `GoalRelationHint` 与目标闭环轻连接。
