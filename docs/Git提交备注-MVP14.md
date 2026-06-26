refactor: 单人版收敛 MVP14，继续逐个抽离 Excel 与 Statistics 视图

本次提交响应新的收敛方向：不急着做文档治理，而是继续把 shared view 逐个抽离。MVP12 已处理 Heatmap，MVP13 已处理 Progress / Timeline，本轮处理 Excel 与 Statistics。

主要改动：
- 新增 src/shared/ui/views/excel-view/ExcelViewModel.ts
- 新增 src/shared/ui/views/excel-view/ExcelViewToolbar.tsx
- ExcelViewModel 承接列宽归一化、内容展示模式归一化、内容按钮 title、Excel render model 构造
- ExcelViewToolbar 承接 Excel 顶部说明区、内容展示模式按钮和 ExcelColumnToolbar 拼装
- ExcelView.tsx 从约 233 行下降到约 183 行，只保留本地保存状态、config 持久化、cell editing hook、Grid/Toolbar 组合
- 新增 src/shared/ui/views/StatisticsView/StatisticsViewModel.ts
- StatisticsViewModel 承接 viewConfig/startDate/year/yearlyWeekStructure/processedData/popover widget key 等 helper
- StatisticsViewContainer.tsx 从约 234 行下降到约 176 行，不再直接维护年度周结构和周期聚合细节
- 新增 test/unit/excelViewModel.test.ts
- 新增 test/unit/statisticsViewModel.test.ts
- 加强 single-user-convergence-gate，要求 ExcelViewModel / ExcelViewToolbar / StatisticsViewModel 存在，并限制 ExcelView / StatisticsViewContainer 行数

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续逐个抽 EventTimelineView
- 继续抽 TaskExecutionView / BlockView / TableView
- Excel 若继续细拆，可处理 ExcelCell / ExcelGrid 的 editor、keyboard、fill drag 子模型
