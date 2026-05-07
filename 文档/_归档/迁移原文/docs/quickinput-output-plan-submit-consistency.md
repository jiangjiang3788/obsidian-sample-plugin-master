# QuickInput 保存计划一致性收口

## 本次目的

上一阶段已经在编辑面板里做了“保存位置实时预览”，但实际保存时 usecase 仍会重新计算一次 OutputPlan / PersistencePlan。
如果两边计算结果漂移，就可能出现：

- UI 显示会保存到 A 文件；
- 点击保存后实际写到 B 文件；
- 或 UI 显示原地更新，实际执行迁移保存。

这类问题比普通失败更危险，所以本次加入提交前一致性校验。

## 做法

`QuickInputModal` 在提交编辑记录时，把当前 UI 实时预览到的：

- `expectedOutputPlan`
- `expectedPersistencePlan`

一起传给 `submitUpdateRecord()`。

`recordInput.usecase.ts` 在真正写入前会重新计算实际计划，并对比：

- 目标文件路径；
- 目标标题；
- 原始路径；
- 是否路径变化；
- 写入策略：`update_in_place` / `move_and_replace`。

如果不一致，直接返回 validation error，阻止保存。

## 为什么不是自动相信 UI 预览

UI 预览只能用于展示，不应该直接作为写入依据。
真正写入仍然必须由 usecase 根据最新模板、主题、字段重新计算。
这次校验的作用是：

> UI 预览和实际写入必须一致；不一致就宁可不保存。

## 验收标准

1. 普通原地保存不受影响。
2. 路径变化迁移保存不受影响。
3. 如果 UI 预览与实际保存计划不一致，保存被阻止。
4. 阻止时提示中文原因。
5. 不产生新记录，也不删除旧记录。
