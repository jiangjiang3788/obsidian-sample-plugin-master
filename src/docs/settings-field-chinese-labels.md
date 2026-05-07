# 设置字段中文显示收口

## 目标

视图设置里的字段选择、分组字段、筛选规则、排序规则、交叉表行/列字段都显示中文名称，例如：

- `themePath` 显示为 `完整主题`
- `rootTheme` 显示为 `根主题`
- `leafTheme` 显示为 `叶主题`
- `startTime` 显示为 `开始时间`
- `endTime` 显示为 `结束时间`
- `categoryKey` 显示为 `类别`

## 设计原则

只改 UI 展示名，不改内部保存 key。

也就是说，设置里看到的是中文，但配置文件里仍保存：

```json
{
  "groupFields": ["rootTheme", "leafTheme"]
}
```

这样不会破坏已有视图、筛选、排序和导出逻辑。

## 修改点

- `src/core/types/fields.ts`
  - 补齐核心字段中文 label。
  - 新增 `themePath/rootTheme/leafTheme` 的中文显示名。
  - 新增 `getFieldOptionLabel()`。

- `src/shared/ui/composites/FieldManager.tsx`
  - 支持外部传入 `getFieldLabel`。
  - 已选字段标签显示中文。
  - 下拉选项显示中文。

- `src/features/settings/ModuleSettingsModal.tsx`
  - 显示字段、分组字段传入 `getFieldLabel`。

- `src/features/settings/RuleBuilder.tsx`
  - 筛选/排序字段下拉显示中文。
  - 已添加规则 Chip 显示中文字段名。

- `src/features/settings/TableViewEditor.tsx`
  - 交叉表行字段、列字段显示中文。

- `src/core/utils/recordSubmitFeedback.ts`
  - 顺手补回 `buildRecordSubmitFeedbackPresentation`，避免 `QuickInputModal` 构建时报未导出。

## 验收

1. 打开视图设置。
2. 显示字段下拉应看到 `完整主题 / 根主题 / 叶主题 / 开始时间 / 结束时间`。
3. 分组字段下拉应显示中文。
4. 筛选规则字段下拉应显示中文。
5. 排序规则字段下拉应显示中文。
6. 交叉表行字段/列字段应显示中文。
7. 保存后原配置仍然使用英文 key，已有视图不应失效。
