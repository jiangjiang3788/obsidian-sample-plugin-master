refactor: 单人版收敛 MVP28，清理 AI 动态输入边界 any

本次提交继续类型治理。MVP26 建立 any-budget gate 和 UnknownRecord 安全读取工具，MVP27 清理 QuickInputEditorModel 与 editStateResolver。本轮继续处理 AI 输出、AI 批量确认和本地检索兜底结果这类动态边界，把不可信输入约束在边界处，避免继续用 any 横向扩散到模型代码。

主要改动：
- AiNaturalLanguageRecordParser 新增 AiParserSnapshot / AiSnapshotBlock / AiSnapshotGoal / AiSnapshotPreset 等最小快照类型
- AiNaturalLanguageRecordParser 的 ensureCommandTarget / cleanAiFieldValues / findBlockByTarget / findGoalByTarget / findPresetByTarget 不再使用显式 any
- safeJsonParseBatch 将 JSON.parse 结果先视为 unknown，再通过 coerceNaturalRecordBatch 收敛为 NaturalRecordBatch
- buildSystemPrompt / buildUserPrompt / buildFastUserPrompt 改用最小快照类型
- AiBatchConfirmModel 将 blocks / themes / goalSettings / inputSettings 收紧为 BlockTemplate / ThemeDefinition / GoalSettings / InputSettings
- AiBatchConfirmModel 将 goal/preset 解析返回值收紧为 GoalDefinition / GoalTemplate
- readPresetThemePath 改用 asUnknownRecord + readFirstString 读取 defaultValues
- RetrievalService 将 MiniSearch SearchResult 的兜底字段读取集中到 readSearchResultText / readSearchResultNumber
- RetrievalService 不再使用 sr as any 拼回兜底 Item 或做过滤条件判断
- 收紧 any-budget-gate：src 预算从 1020 降到 935，总预算从 1185 降到 1105，colon any 预算从 515 降到 460

治理结果：
- src 显式 any 从 1017 降到 933
- total 显式 any 从 1183 降到 1099
- AiNaturalLanguageRecordParser 从 43 个 any 降到 0
- AiBatchConfirmModel 从 19 个 any 降到 0
- RetrievalService 从 22 个 any 降到 0

验证：
- npm run any-budget:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck、unit test 和 build。
