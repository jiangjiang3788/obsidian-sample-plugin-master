# Think OS 1.0.61 代码交付说明

- 筛选/排序规则只显示产品字段名，例如 `记录类型`，不再显示 `(coreBlock)`。
- 记录类型仍保存 canonical 值，但 UI 使用 Record Type 的中文 `name`：`task→任务`、`plan→计划`、`review→总结`、`thought→思考`、`habit→打卡`、`evidence→事件`、`blocker→阻碍项`、`milestone→里程碑`。
- 高级筛选、常用筛选、顶部筛选摘要、通用字段 pill 统一使用同一个 `formatFieldValue`。
- 多选下拉支持 value/label 分离，保存英文 canonical 值、显示中文。
- 保留 1.0.60 的 Overlay 层级收口。
- 中文源码/文档文件名使用正常 UTF-8，例如 `docs/DOCUMENT_GOVERNANCE.md`。
