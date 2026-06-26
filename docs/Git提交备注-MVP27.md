refactor: 单人版收敛 MVP27，收紧核心输入链路 any 预算

本次提交继续类型治理。MVP26 已建立 any-budget gate 和 UnknownRecord 安全读取工具，本轮开始真正降低核心链路显式 any，优先处理 QuickInputEditorModel 和 recordInput/editStateResolver 两个高风险模型文件。

主要改动：
- QuickInputEditorModel 新增 QuickInputFormData / QuickInputContext / QuickInputOptionLike / QuickInputTemplateLike / QuickInputPeriodLike 等最小领域类型
- QuickInputEditorModel 将 formData/context/template/period/option 相关 any 收紧为 unknown 或具体模板类型
- deriveQuickInputInitialSelection 改用 readFirstString / readRecord 读取动态 __goalContext
- goal sortOrder 读取改用 asUnknownRecord + readNumber，避免 goal 对象继续 as any
- editStateResolver 将 field 参数收紧为 TemplateField，将 block 评分和模板识别收紧为 BlockTemplate
- editStateResolver 的 readCoreBlockHint 改用 asUnknownRecord + readFirstString，移除 item as any 读取 coreBlock/coreBlockId
- editStateResolver 的 rating/select/path 选项匹配改用 TemplateField.options 类型
- 收紧 any-budget-gate：src 预算从 1090 降到 1020，总预算从 1260 降到 1185，colon any 预算从 560 降到 515

治理结果：
- src 显式 any 从 1087 降到 1017
- total 显式 any 从 1253 降到 1183
- QuickInputEditorModel 从 45 个 any 降到 0
- editStateResolver 从 25 个 any 降到 0

验证：
- npm run any-budget:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck、unit test 和 build。
