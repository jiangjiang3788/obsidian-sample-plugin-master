# MVP8 Progress

## 目标

继续推进新领域模型稳定化：减少预设冗余、AI 确认页显示匹配结果、进一步去 legacy 心智。

## 已完成

- GoalTemplateEditorModal 保存时只保存与 CoreBlock 的差异。
- 预设字段结构与 CoreBlock 一致时不再保存完整 fields。
- 预设输出格式与 CoreBlock 一致时不再保存 outputTemplate。
- 预设目标文件与 CoreBlock 一致时不再保存 targetFile。
- 预设标题位置与 CoreBlock 一致时不再保存 appendUnderHeader。
- 预设 requiredFields 与 CoreBlock 一致时不再保存 requiredFields。
- defaultValues 过滤 goal/template/period/legacy 等系统字段，只保留真正的预设默认值。
- AI 批量确认页左侧列表显示目标 + 预设，不再只显示 Block。
- AI 批量确认页头部显示目标 / 预设 / 主题匹配结果。
- data.mvp8-cleaned.json 继续压缩为差异存储。

## 已验证

- npm run domain:gate
- npm run core-public:gate
- npm run obsidian-leak:gate
- npm run feature:gate
- npm run arch:gate

## 未完成

- npm run typecheck:src：当前环境缺少 node_modules，仍无法完整执行。
- npm run build：当前环境缺少 node_modules，仍无法完整执行。
- Markdown 迁移：等待用户提供文档压缩包。
