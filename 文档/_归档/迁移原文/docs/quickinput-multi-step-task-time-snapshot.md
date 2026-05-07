# QuickInput 多步推进：任务内容单入口、时间计算别名、Snapshot 主链准备

## 本次合并推进内容

这一步不是单个 bugfix，而是把前面几个主线点合并推进：

1. **任务编辑初始值更靠近 Snapshot**：`editStateResolver.buildInitialFormData()` 先构造 `ParsedRecordSnapshot`，字段回填优先读 `snapshot.semantic`。
2. **任务正文仍然走唯一入口**：任务内容字段优先走 `extractTaskEditableText()` 的结果，避免回退到旧的 `item.title`。
3. **时间计算支持字段别名**：保存前不再只认 `时间 / 结束 / 时长`，会按模板字段的 `key / label / semanticType / role` 识别 `start/startTime/end/endTime/duration` 等别名。
4. **主题三分法继续作为语义层字段**：编辑回填时主题字段优先读 `semantic.themePath / rootTheme / leafTheme`。

## 为什么要这样改

之前的问题是：

- parser 能提取完整正文，但编辑回填可能又读 `item.title`。
- 时间默认值能显示，但保存前 normalize 只认中文固定字段，模板字段别名可能不参与最终计算。
- 主题路径在视图层拆了，但编辑回填仍可能从旧的 `item.theme/header/categoryKey` 混读。

这次把这些都往 `ParsedRecordSnapshot.semantic` 收，让下一步切 `prepareEdit` 主路径时风险更低。

## 调试方式

控制台打开：

```js
window.__THINK_RECORD_DEBUG__ = true
```

然后重新编辑/保存任务。重点看：

- `[记录调试][任务读取]`
- `[记录调试][编辑读取]`
- `[记录调试][时间计算] normalizeRecordInput 保存前时间字段归一化`

## 本次仍不做

- 不自动跨文件迁移。
- 不删除 `editStateResolver`。
- 不把所有 block 编辑一次性迁到 snapshot。

这些留到下一步：正式切 `prepareEdit` 主路径与 legacy 清理。
