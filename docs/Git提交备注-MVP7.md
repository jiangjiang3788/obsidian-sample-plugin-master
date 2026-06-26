refactor: 单人版收敛 MVP7，抽出记录预设编辑模型层

本次提交继续推进单人插件收敛。MVP4-MVP6 已经把 QuickInput 的主要输入模型抽出，本轮开始处理下一个大文件 GoalTemplateEditorModal，把记录预设编辑的 draft 构造、主题字段处理、patch 构造和继承/覆盖切换逻辑移到独立模型层。

主要改动：
- 新增 src/features/settings/goalTemplates/GoalTemplateEditorModel.ts
- 将 makeDraftFromTemplate / makeNewDraft 抽出到模型层
- 将 buildInheritedDraft / switchDraftToOverride 抽出到模型层
- 将 buildTemplatePatchFromDraft / buildInheritedTemplatePatchFromDraft / buildDraftDiffSummary 抽出到模型层
- 将主题路径清洗、主题字段回填、默认值合并、主题选项构建抽出到模型层
- 将复制预设 draft 构造逻辑抽出为 createCopiedDraft
- GoalTemplateEditorModal.tsx 从约 630 行下降到约 302 行
- 新增 test/unit/goalTemplateEditorModel.test.ts，覆盖主题路径、草稿构造、主题切换、继承草稿、patch compact 和 variant 排序
- 加强 single-user-convergence-gate，要求 GoalTemplateEditorModel 存在，并将 GoalTemplateEditorModal.tsx 行数限制收紧到 360 行

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为“涉及修改/新增文件补丁包”，保留完整路径，可直接覆盖到项目中。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后再运行新增单测、typecheck 和 build。

下一步：
- 继续拆 GoalTemplateEditorModal 的 JSX 区块
- 拆分 GoalTemplateMatrix 的数据模型与表格展示
- 推进 QuickInput / AI / 编辑记录统一输入外观层
