refactor: 单人版收敛 MVP20，轻量抽离 Statistics 周期视图模型

本次提交继续按“逐个视图抽离”的方向推进，但保留防过度工程化约束：只抽仍然承担周期计算、派生状态、重复规则或测试价值的视图，不为了统一形式强拆小组件。

主要改动：
- 新增 src/shared/ui/views/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx
- 将 StatisticsViewView.tsx 内联的目标/主题摘要 strip 拆出，并抽出 summary rows、label、title、text helper
- StatisticsViewView.tsx 从约 163 行下降到约 93 行，只保留空态、theme strip 和 Day/Week/Month/Quarter/Year 视图分发
- 新增 src/shared/ui/views/StatisticsView/views/MonthStatisticsViewModel.ts
- MonthStatisticsViewModel 承接月份周元数据 buildMonthWeekMeta 和 buildMonthStatisticsRenderModel
- MonthStatisticsView.tsx 不再直接维护 weekCursor、weeksMeta、getMonthWeeksData 等派生逻辑，从约 110 行下降到约 66 行
- 新增 src/shared/ui/views/StatisticsView/views/QuarterStatisticsViewModel.ts
- QuarterStatisticsViewModel 承接季度内月份、周起点、周数据和占位数量 render model
- QuarterStatisticsView.tsx 不再直接维护 aggregateByQuarter / aggregateByMonth / getMonthWeeksData / 周列占位计算，从约 143 行下降到约 87 行
- 新增 src/shared/ui/views/StatisticsView/views/YearStatisticsViewModel.ts
- YearStatisticsViewModel 承接年度季度 gridColumn、月份 quarter-end class、周列占位和 week fallback data render model
- YearStatisticsView.tsx 从约 140 行下降到约 108 行
- 新增 test/unit/statisticsPeriodViewModel.test.ts，覆盖 summary strip、月/季/年周期 render model
- 加强 single-user-convergence-gate，要求 Statistics 周期模型存在，限制主视图行数，并防止周期聚合 helper 回流

防过度工程化说明：
- 本轮没有拆 TimerView / TimerViewView，因为它们已经是小型容器/展示组件
- 本轮没有拆 CategoryFilter / ThemeFilter，因为它们行数低且职责单一
- 后续仍按“有计算、有重复规则、有测试价值才抽”的标准推进

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续盘点剩余 shared view，只抽有明确复杂度和测试价值的视图
- 小型纯展示组件不强拆，避免过度工程化
