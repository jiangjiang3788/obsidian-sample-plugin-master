# MVP7 Progress - AI 主链收敛与数据清理

## 本版目标

MVP7 从 MVP6 继续推进，不再做迁移能力，也不做 Markdown 文档迁移。重点是让运行时更干净地使用新模型：Goal × Block → Template Variant → QuickInput / AI。

## 已完成

1. AI 快照过滤系统上下文字段：goalId、goalPath、themePath、templateId、period 等不再作为普通字段发给模型。
2. AI 快照兼容旧 enabledBlockIds：如果 data 里还是旧 blk_* ID，且匹配不到当前 CoreBlock，则自动忽略过滤，避免 snapshot.blocks 为空。
3. AI prompt 改为新主链：要求模型优先输出 goalPath、categoryKey/blockId、goalTemplateId/templateVariantId、themeId。
4. AI 输出规范化：解析后用 snapshot 反查并补齐 goalId、goalPath、blockId、categoryKey、goalTemplateId、templateVariantId、themeId。
5. AI fieldValues 清理：模型误把目标、主题、模板、周期字段放进 fieldValues 时会丢弃。
6. AI 设置页增加旧 Block ID 提示和“清理旧 Block ID”按钮。
7. AI 设置页空 enabledBlockIds 语义修正：空数组代表全部参与，勾选交互不再反直觉。
8. QuickInput 不再读取 settings.overrides 来禁用主题；Theme 只作为上下文字段。
9. QuickInput 支持从 context / initialFormData 读取 goalTemplateId / templateId 来定位记录预设。
10. QuickInput state 增加 goalTemplateId / templateId，提交链路能用稳定预设 ID。
11. 数据文件 data.mvp7-cleaned.json 清理旧 aiSettings.enabledBlockIds，空数组表示全部当前记录类型参与。
12. domain gate 增加 AI 新主链和 QuickInput 不读 overrides 的检查。

## 未完成

- 未做 Markdown 文档迁移：等待用户提供文档压缩包。
- 未完整 typecheck/build：当前环境没有 node_modules。
- 预设编辑器“只保存差异”还未彻底完成，仍是下一阶段重点。
- 视图层旧字段依赖尚未完全清除。

## 已验证

- npm run domain:gate
- npm run core-public:gate
- npm run obsidian-leak:gate
- npm run feature:gate
- npm run arch:gate
