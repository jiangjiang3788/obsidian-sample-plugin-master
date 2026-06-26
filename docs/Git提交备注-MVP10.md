refactor: 单人版收敛 MVP10，建立 RecordInputFacade 统一输入外观层

本次提交继续推进单人插件收敛。前几轮已经完成 QuickInput、记录预设编辑、目标预设矩阵的大文件拆分，本轮开始统一记录输入入口，避免 QuickInput、AI 批量确认、编辑记录在提交前各自维护草稿构造、必填校验、字段归一化和批量结果汇总。

主要改动：
- 新增 src/core/services/recordInput/RecordInputFacade.ts
- 在 core/public.ts 暴露 RecordInputFacade 的稳定 helper
- 新增 findMissingRecordInputRequiredFields / assertRecordInputRequiredFields，统一记录输入必填校验
- 新增 buildRecordCreateDraftFromEditorState，统一 QuickInput onSave 草稿构造
- 新增 buildCreateRecordSubmitParamsFromEditorState，统一创建记录 submit payload 构造
- 新增 buildUpdateRecordSubmitParamsFromEditorState，统一编辑记录 submit payload 构造
- 新增 buildRecordDraftContext，统一 AI / QuickInput context 合并规则
- 新增 normalizeRecordInputFormDataForTemplate，统一 select/radio/rating 等模板字段归一化
- 新增 buildBatchCreateRecordSubmitResult，统一 AI 批量创建结果汇总
- useQuickInputSubmit.ts 移除本地 hasRequiredValue / findMissingRequiredFields，改用 RecordInputFacade
- AiBatchConfirmModal.tsx 移除本地 normalizeAiFieldValue / normalizeAiFormData / buildBatchCreateResult，改用 RecordInputFacade
- 修复 AiBatchConfirmModal.tsx 中重复声明 const isActive 的问题
- 新增 test/unit/recordInputFacade.test.ts，覆盖必填校验、创建/编辑 payload、草稿拷贝、字段归一化、context 合并和批量结果汇总
- 加强 single-user-convergence-gate，要求 RecordInputFacade 存在，并禁止 QuickInput / AI 重新出现本地重复 helper

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 拆分 AiBatchConfirmModal，建立 AiBatchConfirmModel
- 将 AI 目标/预设解析、列表渲染、编辑区和底部操作继续拆开
- 清理 Heatmap / Progress / Timeline 的 viewModel 重复
