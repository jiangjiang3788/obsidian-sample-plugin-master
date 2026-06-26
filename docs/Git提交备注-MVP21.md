refactor: 单人版收敛 MVP21，轻量抽离 Heatmap 内容层与 Timeline 日视图

本次提交继续按“逐个视图抽离”的方向推进，但保持防过度工程化约束：只处理仍然有明确复杂度、派生状态和测试价值的视图，不继续强拆小型纯展示组件。

主要改动：
- 新增 src/shared/ui/views/HeatmapViewContent.tsx
- 新增 src/shared/ui/views/HeatmapLayoutModel.ts
- HeatmapViewContent 承接天视图、目标分组视图、普通主题视图的内容分发
- HeatmapLayoutModel 承接垂直布局跳过规则、阈值判断、verticalLayouts Set 更新和 collapsedThemes Set 更新
- HeatmapView.tsx 从约 326 行下降到约 254 行，只保留数据装配、rating mapping cache、创建/记录管理交互、ResizeObserver 和子组件组合
- 新增 src/shared/ui/views/TimelineView/TimelineDailyView.tsx
- 新增 src/shared/ui/views/TimelineView/TimelineDailyViewModel.ts
- TimelineDailyView 承接总结进度列、日列 header、时间轴刻度和日列 body
- TimelineDailyViewModel 承接 daily columns 和 time axis rows 构造
- TimelineViewView.tsx 从约 174 行下降到约 111 行，只保留空态、汇总表和日时间轴分发
- 新增 test/unit/heatmapLayoutModel.test.ts
- 新增 test/unit/timelineDailyViewModel.test.ts
- 加强 single-user-convergence-gate，要求 HeatmapViewContent / HeatmapLayoutModel / TimelineDailyView / TimelineDailyViewModel 存在，并限制主文件行数，防止本地内容分发和日视图渲染 helper 回流

防过度工程化说明：
- 本轮没有拆 TimerView / TimerViewView，因为它们已经是小型容器/展示组件
- 本轮没有拆 CategoryFilter / ThemeFilter，因为它们行数低且职责单一
- 本轮没有拆 DayStatisticsView / WeekStatisticsView，因为它们目前不值得为了形式统一继续拆

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 再做 1 版剩余视图盘点和门禁总收口
- 如剩余视图都已足够小，则不再继续强拆，转入文档治理或最终封版
