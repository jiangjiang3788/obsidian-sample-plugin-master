refactor: 单人版收敛 MVP29，清理模板模型与字段筛选核心 any

本次提交继续类型治理。MVP26 建立 any-budget gate 和 UnknownRecord 安全读取工具，MVP27 清理 QuickInput/editor-state 核心输入链路，MVP28 清理 AI 动态输入边界。本轮继续优先处理模型层和数据核心，不进入 UI primitive，重点清理 GoalTemplateEditorModel、itemFilter 和 FieldValueResolver 的显式 any。

主要改动：
- GoalTemplateEditorModel 使用 ThemeDefinition / TemplateField / UnknownRecord 替代显式 any
- GoalTemplateEditorModel 的 readOptionText、theme/icon 字段识别、周期粒度读取、字段结构比较、主题 options / theme map 构造不再依赖 as any
- itemFilter 将比较值、列表值、between 范围和规则值收紧为 unknown
- itemFilter 的 titleLower/contentLower/fullDataLower/tagsLower/goalPathsLower 预处理字段改用 UnknownRecord reader 读取
- FieldValueResolver 的 file/category/image/theme/period/goalPaths/dynamic canonical 字段读取改用 Item 原生字段或 UnknownRecord reader
- 收紧 any-budget-gate：src 预算从 935 降到 875，总预算从 1105 降到 1040，as any 预算从 560 降到 520，colon any 预算从 460 降到 440

治理结果：
- src 显式 any 从 933 降到 870
- total 显式 any 从 1099 降到 1036
- GoalTemplateEditorModel 从 28 个 any 降到 0
- itemFilter 从 19 个 any 降到 0
- FieldValueResolver 从 16 个 any 降到 0

验证：
- npm run any-budget:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck、unit test 和 build。
