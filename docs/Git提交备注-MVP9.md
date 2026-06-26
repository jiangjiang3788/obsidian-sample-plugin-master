refactor: 单人版收敛 MVP9，拆分目标预设矩阵行与单元格

本次提交继续推进目标预设矩阵的结构收敛。MVP8 已经把 GoalTemplateMatrix 的表格 UI 拆到 GoalTemplateMatrixTable，本轮继续避免表格文件变成新的大文件，将目标行和 Block 单元格进一步拆出。

主要改动：
- 新增 GoalTemplateMatrixRow.tsx，承接目标行、目标路径单元格、目标折叠、目标拖拽排序、目标删除按钮
- 新增 GoalTemplateMatrixCell.tsx，承接 Block 单元格、添加预设按钮、预设卡片渲染、预设拖拽进入/释放状态
- 重写 GoalTemplateMatrixTable.tsx，让它只保留表格壳、表头、空状态和分组渲染
- GoalTemplateMatrixTable.tsx 从约 372 行下降到约 100 行
- 目标预设矩阵形成四层结构：主容器 / 表格壳 / 目标行 / Block 单元格
- 加强 single-user-convergence-gate，要求 Row/Cell 文件存在，并限制 MatrixTable/Row/Cell 的行数上限
- 本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径

验证：
- npm run single-user:gate 通过
- npm run gate 通过

未完整运行 typecheck/build：当前环境没有 node_modules。请本地执行 npm ci 后运行 npm run typecheck:src 和 npm run build。

下一步：
- 建立 RecordInputFacade，统一 QuickInput / AI / 编辑记录输入外观层
- 或继续清理 GoalTemplateMatrixRow/Cell 的样式常量和拖拽事件模型
