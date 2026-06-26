refactor: 单人版收敛 MVP15，抽离 EventTimeline 与 TaskExecution 视图

本次提交继续按“逐个视图抽离”的方向推进。MVP12-MVP14 已完成 Heatmap、Progress、Timeline、Excel、Statistics 的模型/子组件拆分，本轮处理 EventTimelineView 与 TaskExecutionView，让 shared view 主文件继续向轻量容器和展示组合收敛。

主要改动：
- 新增 src/shared/ui/views/EventTimelineView/EventTimelineViewModel.ts
- 新增 src/shared/ui/views/EventTimelineView/EventTimelineEventList.tsx
- EventTimelineViewModel 承接 displayFields/groupFields/viewConfig 构造、时间字段读取、日期范围过滤排序、分组树构造、task 展示标题 fallback 等 helper
- EventTimelineViewContainer.tsx 从约 136 行下降到约 100 行，只保留 render model memo 和 view props 拼装
- EventTimelineViewView.tsx 从约 157 行下降到约 93 行，只保留空状态、非分组容器、GroupedContainer 和 EventTimelineEventList 组合
- 新增 src/shared/ui/views/TaskExecutionViewModel.ts
- 新增 src/shared/ui/views/TaskExecutionChipGrid.tsx
- 新增 src/shared/ui/views/TaskExecutionContextMenu.tsx
- TaskExecutionViewModel 承接 chip tone、task map、selected task、记录链接 label、完成次数 label 等 helper
- TaskExecutionView.tsx 从约 168 行下降到约 69 行，只保留 menu 状态、外部点击关闭、Escape 关闭和子组件组合
- 新增 test/unit/eventTimelineViewModel.test.ts
- 新增 test/unit/taskExecutionViewModel.test.ts
- 加强 single-user-convergence-gate，要求 EventTimeline/TaskExecution 的模型与子组件存在，并限制主文件行数，防止本地 helper 回流

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续逐个抽 TaskExecution 之外剩余视图：BlockView / TableView
- 继续细拆 ExcelCell / ExcelGrid 的 editor、keyboard、fill drag 子模型
