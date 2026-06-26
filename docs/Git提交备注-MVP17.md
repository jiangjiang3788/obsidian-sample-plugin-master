refactor: 单人版收敛 MVP17，抽离 Excel 单元格与网格交互模型

本次提交继续按“逐个视图抽离”的方向推进。MVP14 已经处理 ExcelView 顶层模型和工具栏，本轮继续深入 Excel 单元格与网格层，将列宽、键盘导航、粘贴矩阵、填充拖拽、单元格 UI 状态和编辑器展示拆出。

主要改动：
- 新增 src/shared/ui/views/excel-view/ExcelGridModel.ts
- 新增 src/shared/ui/views/excel-view/ExcelCellModel.ts
- 新增 src/shared/ui/views/excel-view/ExcelCellEditor.tsx
- 新增 src/shared/ui/views/excel-view/ExcelCellContent.tsx
- ExcelGridModel 承接列标题/徽标/列宽、剪贴板矩阵解析、cell 构造、导航位置、填充拖拽范围和粘贴批量编辑计划
- ExcelCellModel 承接单元格 UI 状态、className/title/saveState、编辑器键盘动作、单元格键盘动作、typed input props 和 Markdown 交互目标判断
- ExcelCellEditor 承接 input / textarea / select 编辑器渲染
- ExcelCellContent 承接 Markdown 全文、content 预览和普通 displayValue 渲染
- ExcelGrid.tsx 从约 279 行下降到约 187 行
- ExcelCell.tsx 从约 294 行下降到约 172 行
- 新增 test/unit/excelGridModel.test.ts
- 新增 test/unit/excelCellModel.test.ts
- 加强 single-user-convergence-gate，要求 ExcelGrid/ExcelCell 模型与子组件存在，并限制主文件行数，防止本地 helper 回流

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续抽 useExcelCellEditing 的提交队列、pending/saved/error 状态 reducer
- 或继续抽 ExcelColumnToolbar 的字段分组与字段选择模型
- 补齐剩余 shared view 的模型层与 gate
