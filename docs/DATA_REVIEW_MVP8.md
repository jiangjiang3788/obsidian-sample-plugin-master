# MVP8 Data Review

基于 data.mvp7-cleaned.json 继续收敛为 data.mvp8-cleaned.json。

## 处理结果

- 目标层 `granularity`：保持清空。
- AI 旧 `blk_*` enabledBlockIds：保持清空，表示使用当前 CoreBlock 范围。
- 非计划 / 总结预设周期：保持清空。
- 计划 / 总结预设：保留 `periodPolicy`。
- 默认值：继续删除 goal/template/period/legacy 等系统迁移痕迹。
- 差异存储：删除与 CoreBlock 完全一致的字段/输出/目标文件/标题覆盖。

## 本轮 data 压缩

- 删除与 CoreBlock 相同的 fields：2 个预设。
- 删除与 CoreBlock 相同的 outputTemplate：2 个预设。
- 删除与 CoreBlock 相同的 targetFile：40 个预设。
- 删除与 CoreBlock 相同的 appendUnderHeader：86 个预设。
- 删除无意义 defaultValues 键：264 个。
- 删除与 CoreBlock 相同的 requiredFields：88 个预设。

## 结论

MVP8 data 更接近新模型：Template Variant 只保存差异，而不是复制 CoreBlock 完整配置。
