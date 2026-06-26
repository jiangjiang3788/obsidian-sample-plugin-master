refactor: 单人版收敛 MVP11，拆分 AI 批量确认模型与展示组件

本次提交继续推进单人插件收敛。MVP10 已经建立 RecordInputFacade，统一 QuickInput 与 AI 批量确认的提交前字段归一化、上下文合并和批量结果汇总。本轮继续拆分 AiBatchConfirmModal，让 modal 只保留生命周期、状态编排、usecase 调用和 QuickInputEditor 挂载。

主要改动：
- 新增 src/platform/modals/AiBatchConfirmModel.ts
- 抽出 resolveGoalForAiTarget / resolvePresetForAiTarget / readPresetThemePath 等 AI 目标和预设解析逻辑
- 抽出 buildAiBatchConfirmRecordItems，统一 AI 识别结果到确认记录列表的构造
- 抽出 patchAiBatchConfirmRecordAtIndex / findNextPendingAiBatchConfirmIndex / summarizeAiBatchConfirmRecords 等纯状态 helper
- 抽出 buildAiBatchConfirmCreateSubmitParams / buildAiBatchConfirmRecordContext / buildAiBatchConfirmBatchSummary，统一提交参数和批量结果汇总
- 新增 AiBatchConfirmSidebar.tsx，承接左侧 AI 识别结果列表和保存全部按钮
- 新增 AiBatchConfirmRecordHeader.tsx，承接右侧标题、目标、预设、主题状态 chip
- 新增 AiBatchConfirmFooter.tsx，承接跳过、保存此条、完成按钮
- AiBatchConfirmModal.tsx 从约 487 行下降到约 248 行
- 新增 test/unit/aiBatchConfirmModel.test.ts，覆盖目标/预设解析、记录构造、字段归一化、记录 patch、提交参数和批量结果汇总
- 加强 single-user-convergence-gate，要求 AI 批量确认模型和展示组件存在，限制 AiBatchConfirmModal.tsx 不超过 280 行，并禁止本地解析 helper 回流

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 清理 Heatmap / Progress / Timeline 的 viewModel 重复
- 推进 shared view 纯展示化
- 做最终文档治理和封版
