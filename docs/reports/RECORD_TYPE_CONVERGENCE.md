# RecordType 收敛（1.0.62 第一版）

## 结论

记录类型只有一个事实源：

1. `src/core/records/schema/contracts.ts`：定义持久化 Record 契约。
2. `src/core/records/schema/definitions.ts`：定义记录类型 ID、名称、默认录入表单、默认文件和能力。
3. `src/core/recordTypes/registry.ts`：只从上述 definitions 派生运行时 Registry；不保存第二份类型列表。

`inputSettings.blocks`、可变 `CoreBlockDefinition`、Blocks slice/usecase 已退出当前模型。不得重新引入。

## 当前用户记录类型

- `core.task` 任务
- `core.habit` 打卡
- `core.plan` 计划
- `core.review` 总结
- `core.thought` 思考
- `core.evidence` 事件
- `core.blocker` 阻碍项
- `core.milestone` 里程碑
- `core.energy` 精力（direct capture，不走 GoalTemplate）

`internal.task-series`、`internal.task-session` 是内部记录，不进入用户选择器。

## 新增一个普通模板型记录类型

第一版仍保持“持久化契约显式声明”，所以新增类型时只允许修改 Record Platform 本身：

1. 在 `records/schema/types.ts` 的 `RecordCoreBlock` 增加 canonical discriminator。
2. 在 `records/schema/contracts.ts` 定义它的 Markdown 字段契约与 capabilities。
3. 在 `records/schema/definitions.ts` 增加 `RECORD_TYPE_IDS` 和 `RecordSchemaDefinition`，并加入 `RECORD_SCHEMA_DEFINITIONS`。

完成后，QuickInput、GoalTemplate、AI/视图适配器都必须通过 `recordTypes/registry.ts` 自动得到该类型，不得在 Feature 层新增第二份类型数组。

如果新增类型拥有真正独立的生命周期/算法（如 Task、Energy），再单独建立领域模块；普通记录类型只需要 Schema + Capture Definition。

## Goal 与 GoalTemplate

- Goal 是用户记录的系统上下文，不是模板里的普通可增删字段。
- `GoalTemplate` 的唯一身份是 `goalPath + recordTypeId`。
- GoalTemplate 只覆盖当前 Goal；没有父 Goal 自动继承。
- 没有 GoalTemplate 时使用该 RecordType 的默认表单。
- “有没有模板”绝不能决定 Goal 是否可选。
- 用户可见且 `goalBindable` 的记录提交时必须有 Goal。

## Capture 规则

所有创建入口最终都应把明确上下文传入 Record Input：

`recordTypeId + goalPath + invocation context -> effective template -> normalized record -> Markdown`

禁止：

- 用 `blocks[0]` / 第一项猜用户想录的记录类型。
- 因为没有 GoalTemplate 就隐藏 Goal。
- 在多个 Feature 里重复维护记录类型名称/顺序/默认表单。
- 把运行时 RecordType 列表重新写入 `data.json`。
- 为旧 `coreBlockId` / `inputSettings.blocks` 增加长期兼容分支。本版本采用一次迁移。

## 仍保留的命名债

底层 `RecordEntity.coreBlock` 仍作为已存在的记录 discriminator 使用；本版不做全项目机械 rename，以免把架构收敛和纯命名迁移混在一起。它不再代表一套独立 CoreBlock 注册系统。

部分旧 Capture API 参数仍叫 `blockId`；它们现在承载 RecordType ID。后续可以单独做纯命名清理。

## 后续状态

1.0.63 已完成 View Registry 的静态元数据收敛；详见 `docs/VIEW_REGISTRY_CONVERGENCE.md`。Runtime component 与 Settings editor 因依赖边界保持为独立 UI 绑定，并由 Gate 强制与 Registry 一致。
