# Task Theme + Readable Time Fix — 2026-08-14

## 用户侧变化

1. 任务创建界面重新显示“主题”，并可选择/清空主题。
2. 即使旧 Goal 任务预设缺少主题字段，也会在运行时补齐主题选择器。
3. 旧任务预设里的“计划时间/计划日期”在新界面统一显示为“开始/预计时间”。
4. 新 Task 持久化不再写入“计划时间 + 计划日期”这套重复概念；开始/预计统一写到 `开始时间`。
5. 未启用重复时，不再把 `重复:: none`、`recurrenceInterval:: 1`、`recurrenceAnchor:: scheduled` 写进 Task。
6. Task 的 `创建于 / 开始时间 / 结束时间 / 完成于 / 取消于 / 跳过于` 在 Markdown 中使用 `YYYY-MM-DD HH:mm` 的可读格式。
7. 旧的 ISO / ISO-Z 时间仍兼容读取；读取 `YYYY-MM-DD HH:mm` 时会在内存中规范化为本地 ISO-like datetime。
8. 时间字段在任务界面和 Task Markdown 顺序中都位于优先级之前。

## 示例

旧：

```text
创建于:: 2026-08-14T04:44:03.209Z
计划时间:: 2026-08-14T12:40
计划日期:: 2026-08-14
重复:: none
recurrenceInterval:: 1
recurrenceAnchor:: scheduled
完成于:: 2026-08-14T04:46:13.126Z
```

新任务（示意；系统会按当前设备本地时区写创建/完成时间）：

```text
创建于:: 2026-08-13 21:44
开始时间:: 2026-08-14 12:40
完成于:: 2026-08-13 21:46
```

有主题时：

```text
主题:: 生活/睡眠
```

不重复时不写任何重复字段。

## 主要修改文件

- `src/features/quickinput/editor/components/Fields.tsx`
- `src/features/quickinput/editor/model/displayTemplate.ts`
- `src/core/recordInput/snapshot/OutputPlanner.ts`
- `src/core/records/codec/MarkdownRecordCodec.ts`
- `src/core/records/RecordRepository.ts`
- `src/core/records/task/taskRecurrence.ts`
- `src/core/services/item/TaskCompletionMutation.ts`
- `main.js`
- `dist/main.js`

## 验证

- `node --check main.js`：通过。
- `node --check dist/main.js`：通过。
- `node scripts/gates/records-gate.mjs`：通过。
- `node scripts/gates/energy-gate.mjs`：通过。
- `task-session-gate` 在原包既有的 cache schema version gate (`CURRENT_CACHE_SCHEMA_VERSION = 14`) 处失败；该检查与本次主题/时间修改无关。
- 完整 TypeScript typecheck 无法执行，因为用户提供的源码包不包含 `node_modules` / 对应类型依赖。
