# 任务编辑模板类型护栏修复

## 问题

用户编辑任务时，原任务行包含：

```text
(模板ID::ovr_xxx) (模板来源::override)
```

之前编辑链路只把 `templateId` 当成 blockId 查找。
当 `ovr_xxx` 是主题覆盖模板 ID 时，直接查 block 会失败，随后进入启发式打分。
如果「闪念」这类 block 模板打分更高，就会把任务误读成 block/闪念，导致 OutputPlan 计算出从任务文件迁移到闪念文件，最终触发安全 MVP 阻止保存。

## 修复

本次在 `editStateResolver.ts` 中增加三层保护：

1. 如果 `templateSourceType === 'override'`，优先在 `settings.overrides` 中用 override id 精确反查 `blockId + themeId`。
2. 如果是 task，只允许在任务模板中推断，避免被「闪念」等 block 模板抢走。
3. 增加中文调试日志 `[记录调试][编辑模板解析]`，打开 `window.__THINK_RECORD_DEBUG__ = true` 后可看到模板选择原因。

## 验收

用如下任务行编辑：

```text
- [x] 🖥 长治学院  设计道旗定稿 (主题::工作/设计) (时间::09:00) (结束::09:30) (时长::30) (模板ID::ovr_mfhzw9d975by6) (模板来源::override) ✅ 2026-04-09
```

预期：

- 不应被解析为「闪念」block。
- 不应把目标文件从任务文件改到 `01/闪念.md`。
- 如果 override id 能在设置中找到，应还原到其绑定的原 block 和 theme。
- 如果找不到 override，也只能在 task 模板中 fallback。
