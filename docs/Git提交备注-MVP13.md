refactor: 单人版收敛 MVP13，拆分 Progress 与 Timeline 渲染模型

本次提交继续推进 shared view 层收敛。MVP12 已经拆分 HeatmapView，本轮处理 ProgressView 与 TimelineViewContainer，减少视图容器里的本地渲染/helper 逻辑，让 shared view 更接近纯展示组合。

主要改动：
- 新增 src/shared/ui/views/ProgressViewModel.ts
- 新增 src/shared/ui/views/ProgressGoalCard.tsx
- 新增 src/shared/ui/views/ProgressSummaryCards.tsx
- ProgressView.tsx 从约 208 行下降到约 37 行，只保留 cards、expandedKeys、summary cards 和 goal cards 组合
- 将进度百分比、summary fallback、block count rows、折叠态 facts、主题细分过滤、目标标题 fallback 等逻辑抽入 ProgressViewModel
- 新增 src/shared/ui/views/TimelineView/TimelineViewModel.ts
- TimelineViewContainer.tsx 从约 169 行下降到约 90 行，只保留 renderModel memo、zoom hook、timeline column click handler 和 View props 拼装
- 将 Timeline fallback config、colorMap、timelineTasks、summary data、summary hours、daily view data、total hours 等构造逻辑抽入 TimelineViewModel
- 新增 test/unit/progressViewModel.test.ts，覆盖 Progress 模型 helper
- 新增 test/unit/timelineViewModel.test.ts，覆盖 Timeline fallback 模型 helper
- 加强 single-user-convergence-gate，防止 ProgressView / TimelineViewContainer 回流本地 helper，并限制文件行数

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 文档治理：删除历史过程文档，只保留当前架构、收敛记录、Git 备注和必要验收文档
- 如果下一轮删除文档文件，则交付完整项目包
