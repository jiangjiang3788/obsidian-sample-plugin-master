refactor: 单人版收敛 MVP16，抽离 BlockView 与 TableView

本次提交继续按“逐个视图抽离”的方向推进。MVP12-MVP15 已处理 Heatmap、Progress、Timeline、Excel、Statistics、EventTimeline、TaskExecution，本轮处理基础 BlockView 与 TableView，让列表/表格视图也进入模型层 + 子组件组合结构。

主要改动：
- 新增 src/shared/ui/views/BlockViewModel.ts
- 新增 src/shared/ui/views/BlockViewItemList.tsx
- BlockViewModel 承接 group field 归一化、分组 render model 构造、timer 查找、GroupedContainer classNames 构造
- BlockViewItemList 承接 TaskRow / BlockItem 渲染、task/block 分支和 timer 注入
- BlockView.tsx 从约 151 行下降到约 103 行，只保留容器宽度监听、render model memo 和 GroupedContainer 组合
- 新增 src/shared/ui/views/TableViewModel.ts
- 新增 src/shared/ui/views/TableViewCell.tsx
- TableViewModel 承接表格配置校验、空配置提示、buildTableMatrix render model 构造和 timer 查找
- TableViewCell 承接空单元格、TaskRow / ItemLink 渲染和紧凑任务展示
- TableView.tsx 从约 80 行下降到约 61 行，只保留表格结构和 TableViewCell 组合
- 新增 test/unit/blockViewModel.test.ts
- 新增 test/unit/tableViewModel.test.ts
- 加强 single-user-convergence-gate，要求 BlockView/TableView 的模型与子组件存在，并限制主文件行数，防止本地 helper 回流

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续细拆 ExcelCell / ExcelGrid 的 editor、keyboard、fill drag 子模型
- 或继续抽剩余 shared view 的小型模型层与展示子组件
