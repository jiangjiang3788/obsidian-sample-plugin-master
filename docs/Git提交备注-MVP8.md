refactor: 单人版收敛 MVP8，拆分目标预设矩阵表格与模型逻辑

本次提交继续推进单人插件收敛，并按新的交付策略只提供本轮新增/修改文件完整补丁包。本轮没有删除文件，因此不需要完整项目包。

主要改动：
- 新增 GoalTemplateMatrixTable.tsx，承接目标预设矩阵的表格、行、单元格、预设卡片和拖拽 UI
- GoalTemplateMatrix.tsx 从约 742 行下降到约 327 行，主文件只保留数据装配、状态管理和 usecase 调用
- 扩展 goalTemplateMatrixModel.ts，抽出矩阵筛选、树状态切换、block chip 切换、目标拖拽排序、预设排序等纯函数
- 新增 filterVisibleGoalTemplateMatrixGoals / splitGoalsByRoot / orderDraggedGoalSiblings / reorderPresetTemplatesInCell 等 helper
- 新增 test/unit/goalTemplateMatrixModel.test.ts，覆盖矩阵筛选、树折叠、block 切换、目标分组、目标拖拽排序、预设排序
- 加强 single-user-convergence-gate，要求 GoalTemplateMatrixTable.tsx 存在，并限制 GoalTemplateMatrix.tsx 不超过 360 行
- 保持 UTF-8 中文文档名，避免 zip 内出现 #Uxxxx 文件名

验证：
- npm run single-user:gate 通过
- npm run gate 通过

未完整运行 typecheck/build：当前环境没有 node_modules。请本地执行 npm ci 后再运行新增单测、typecheck 和 build。

下一步：
- 继续拆 GoalTemplateMatrixTable 的行/单元格组件，或转向统一 QuickInput / AI / 编辑记录的输入模型外观层
- 建立 RecordInputFacade，避免三个输入入口继续各自维护 draft 逻辑
