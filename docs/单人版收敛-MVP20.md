# 单人版收敛 MVP20：Statistics 周期视图轻量抽离

## 本轮原则

本轮继续响应“逐个视图都抽一下”的方向，但保留 MVP19 的防过度工程化约束：

- 只抽仍然包含明显计算、派生状态、重复规则或测试价值的视图。
- 小于约 80 行且职责清楚的组件不强拆。
- 纯展示组件不为了统一形式而增加文件跳转。

因此本轮没有继续拆 `TimerView`、`CategoryFilter`、`ThemeFilter`，而是处理 `StatisticsView` 中仍然承担周期聚合和网格计算的部分。

## 改动范围

### 1. StatisticsViewView

新增：

- `src/shared/ui/views/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx`

变化：

- 将 `StatisticsViewView.tsx` 内联的目标/主题摘要 strip 拆出。
- 新增 `getStatisticsGoalThemeSummaryRows`、`getStatisticsGoalThemeSummaryLabel`、`getStatisticsGoalThemeSummaryTitle`、`getStatisticsGoalThemeSummaryText`。
- `StatisticsViewView.tsx` 从约 163 行下降到约 93 行。
- 主文件只保留：空态、theme strip 组合、按当前视图分发到 Day/Week/Month/Quarter/Year。

### 2. MonthStatisticsView

新增：

- `src/shared/ui/views/StatisticsView/views/MonthStatisticsViewModel.ts`

变化：

- 抽出月份周元数据构造：`buildMonthWeekMeta`。
- 抽出月份 render model：`buildMonthStatisticsRenderModel`。
- `MonthStatisticsView.tsx` 不再直接维护 `weekCursor`、`weeksMeta`、`getMonthWeeksData` 等派生逻辑。
- `MonthStatisticsView.tsx` 从约 110 行下降到约 66 行。

### 3. QuarterStatisticsView

新增：

- `src/shared/ui/views/StatisticsView/views/QuarterStatisticsViewModel.ts`

变化：

- 抽出季度月份周起点：`buildQuarterMonthWeekStarts`。
- 抽出季度 render model：`buildQuarterStatisticsRenderModel`。
- `QuarterStatisticsView.tsx` 不再直接维护 `aggregateByQuarter`、`aggregateByMonth`、`getMonthWeeksData`、周列占位计算。
- `QuarterStatisticsView.tsx` 从约 143 行下降到约 87 行。

### 4. YearStatisticsView

新增：

- `src/shared/ui/views/StatisticsView/views/YearStatisticsViewModel.ts`

变化：

- 抽出年度每月最大周数计算：`getYearStatisticsMaxWeeksInMonth`。
- 抽出年度 render model：`buildYearStatisticsRenderModel`。
- `YearStatisticsView.tsx` 不再直接维护季度 gridColumn、月份 quarter-end class、周列占位、week fallback data。
- `YearStatisticsView.tsx` 从约 140 行下降到约 108 行。

## 单测

新增：

- `test/unit/statisticsPeriodViewModel.test.ts`

覆盖：

- 目标/主题摘要 strip helper。
- 月份周元数据和月份 render model。
- 季度月份/周 render model 和占位规则。
- 年度季度、月份、周列 render model。

## 门禁

更新：

- `scripts/gates/single-user-convergence-gate.mjs`

新增检查：

- 要求 `StatisticsGoalThemeSummaryStrip.tsx` 存在。
- 要求 `MonthStatisticsViewModel.ts`、`QuarterStatisticsViewModel.ts`、`YearStatisticsViewModel.ts` 存在。
- 限制：
  - `StatisticsViewView.tsx <= 110` 行
  - `MonthStatisticsView.tsx <= 90` 行
  - `QuarterStatisticsView.tsx <= 110` 行
  - `YearStatisticsView.tsx <= 125` 行
- 防止周期聚合和周游标逻辑回流到视图文件。

## 验证

已通过：

```bash
npm run single-user:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因：当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。

## 防过度工程化记录

本轮刻意没有拆：

- `src/features/timer/TimerView.tsx`
- `src/features/timer/TimerViewView.tsx`
- `src/shared/ui/views/CategoryFilter.tsx`
- `src/shared/ui/views/ThemeFilter.tsx`

原因：这些文件已经足够短，职责清楚，继续拆会增加文件跳转成本，收益不明显。
