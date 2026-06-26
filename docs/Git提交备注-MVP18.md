refactor: 单人版收敛 MVP18，抽离 Excel 编辑状态与字段工具栏模型

本次提交继续按“逐个视图抽离”的方向推进。MVP14 已处理 ExcelView 顶层模型和工具栏，MVP17 已处理 ExcelGrid / ExcelCell 的交互模型、编辑器和内容展示。本轮继续深入 Excel 剩余复杂点，处理 useExcelCellEditing 与 ExcelColumnToolbar。

主要改动：
- 新增 src/shared/ui/views/excel-view/ExcelCellEditingModel.ts
- ExcelCellEditingModel 承接 Set 状态不可变更新、单格编辑计划、批量提交计划、validation error 合并、commit 失败信息、normalizedValue 合并和 fill drag 批量编辑计划
- useExcelCellEditing.ts 不再直接维护 add/remove pending/saved key helper，也不再直接拼装 batch validation 计划
- useExcelCellEditing.ts 从约 280 行下降到约 231 行
- 新增 src/shared/ui/views/excel-view/ExcelColumnToolbarModel.ts
- ExcelColumnToolbarModel 承接字段排序、添加、移除、拖拽 drop 排序、可添加字段 options 和字段菜单 model
- 新增 src/shared/ui/views/excel-view/ExcelColumnChipList.tsx
- 新增 src/shared/ui/views/excel-view/ExcelColumnContextMenu.tsx
- ExcelColumnToolbar.tsx 不再直接维护字段 chip 列表和 context menu DOM
- ExcelColumnToolbar.tsx 从约 190 行下降到约 119 行
- 新增 test/unit/excelCellEditingModel.test.ts
- 新增 test/unit/excelColumnToolbarModel.test.ts
- 加强 single-user-convergence-gate，要求 Excel editing / column toolbar 模型和子组件存在，并限制 useExcelCellEditing / ExcelColumnToolbar 行数，防止 helper 回流

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续逐个抽剩余 shared view
- 或继续处理 ExcelColumnToolbar 的 keyboard/accessibility helper
- 补齐 TimerView / KanbanView / remaining shared view 的模型层与 gate
