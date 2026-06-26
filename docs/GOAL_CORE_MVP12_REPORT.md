# GOAL CORE MVP12 - Progress / Statistics 视图收敛版

## 目标

本版严格按现有视图架构走，不再给 Progress / Statistics 增加内部顶部控制区。

核心原则：

- 控制栏负责年/季/月/周/天和当前日期。
- 视图筛选负责目标、主题、Block、关键词等过滤。
- Progress 只展示目标经验卡片。
- Statistics 只按目标统计，并保留原 Day / Week / Month / Quarter / Year 周期结构。
- 新增数据统一走快捷输入面板，视图内不创建数据。

## 本版完成

| 模块 | 动作 | 状态 |
|---|---|---|
| GoalOverview / GoalDetail | 从默认数据和公开注册入口移除，只保留旧 viewType 运行时兼容映射 | 完成 |
| Progress | 改为按目标分组的经验卡片视图 | 完成 |
| Progress | 每个目标一张卡片，可折叠/展开 | 完成 |
| Progress | 每个目标复用原 computeProgression 经验算法 | 完成 |
| Progress | 展示目标经验、等级、进度、记录数、Block 统计、最近更新 | 完成 |
| Statistics | 不再使用独立 GoalBarChart，不绕开原统计 UI | 完成 |
| Statistics | `Day / Week / Month / Quarter / Year` 原结构保留 | 完成 |
| Statistics | 周视图、月内周块、季度/月/周、年/季/月/周全部按目标作为柱子 | 完成 |
| Statistics | `ChartBlock` 从分类点击过滤改为可注入 bucketAccessor，目标柱点击只显示该目标数据 | 完成 |
| Statistics | 内部 TopControls 不再渲染，周期由外部控制栏统一控制 | 完成 |
| Statistics | Popover 禁用 quickCreate，视图只展示不创建 | 完成 |
| 目标分组 | 新增 `itemGoalGrouping.ts`，统一 goalPath / goalPaths / goalId / 旧字段 / 未归属规则 | 完成 |
| data.json | `goalCoreMvpVersion = 12` | 完成 |

## 关键文件

```txt
src/core/goal/itemGoalGrouping.ts
src/core/utils/statisticsAggregation.ts
src/features/settings/viewModels/progressViewModel.ts
src/features/settings/viewModels/statisticsViewModel.ts
src/shared/ui/views/ProgressView.tsx
src/shared/ui/statistics/ChartBlock.tsx
src/shared/ui/views/StatisticsView/StatisticsViewContainer.tsx
src/shared/ui/views/StatisticsView/StatisticsViewView.tsx
src/shared/ui/views/StatisticsView/views/DayStatisticsView.tsx
src/shared/ui/views/StatisticsView/views/WeekStatisticsView.tsx
src/shared/ui/views/StatisticsView/views/MonthStatisticsView.tsx
src/shared/ui/views/StatisticsView/views/QuarterStatisticsView.tsx
src/shared/ui/views/StatisticsView/views/YearStatisticsView.tsx
src/features/settings/layout/ViewContent.tsx
```

## Progress 设计

Progress 现在的输入仍然是 `useViewData` 经过控制栏和视图筛选后的 items。

数据流：

```txt
控制栏/视图筛选
  -> useViewData
  -> buildProgressViewModel
  -> buildGoalBuckets
  -> 每个目标 computeProgression(goalItems)
  -> ProgressView 目标经验卡片
```

UI：

- 无内部顶部控制区。
- 每个目标一张卡片。
- 默认折叠。
- 展开后展示经验和 Block 统计。
- 不显示新建按钮。

## Statistics 设计

Statistics 现在只按目标统计。

数据流：

```txt
控制栏/视图筛选
  -> useViewData
  -> buildStatisticsViewModel
  -> buildGoalBuckets
  -> StatisticsView 原 Day/Week/Month/Quarter/Year 结构
  -> ChartBlock 目标柱状图
```

保留：

- 天视图单日结构。
- 周视图周内整体结构。
- 月视图“月汇总 + 每周块”。
- 季度视图“季度汇总 + 月 + 周”。
- 年视图“年 + 季 + 月 + 周”。

改变：

- 原柱子 = 分类。
- 现柱子 = 目标。

## 验证

已通过：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/dual-system-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/events-boundary-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/di-resolve-gate.mjs
node scripts/gates/modal-promise-gate.mjs
node scripts/gates/selector-giant-subscription-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

受限：

```bash
npm run typecheck:src
```

当前容器中 `node_modules` 的 `node / preact / vite/client` 类型包目录为空，仍无法完成完整 TypeScript 检查和 build。请在本地完整依赖环境执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 完整进度表

| 编号 | 模块 | 目标状态 | 当前进度 | 状态 |
|---|---|---:|---:|---|
| 1 | GoalOverview | 不作为新视图暴露 | 100% | 完成 |
| 2 | GoalDetail | 不作为新视图暴露 | 100% | 完成 |
| 3 | Legacy mapping | 老 GoalOverview/GoalDetail 不白屏 | 100% | 完成 |
| 4 | Progress 控制 | 不内置顶部控制区 | 100% | 完成 |
| 5 | Progress 分组 | 按目标分组 | 100% | 完成 |
| 6 | Progress 经验 | 每目标复用原经验算法 | 100% | 完成 |
| 7 | Progress UI | 每目标一张可折叠卡片 | 100% | 完成 |
| 8 | Progress 统计 | 展示 Block 统计和最近更新 | 90% | 完成基础版 |
| 9 | Statistics 控制 | 不内置顶部控制区 | 100% | 完成 |
| 10 | Statistics 主维度 | 只按目标 | 100% | 完成 |
| 11 | Statistics 周视图 | 周内柱子按目标 | 100% | 完成 |
| 12 | Statistics 月视图 | 月汇总 + 每周块按目标 | 100% | 完成 |
| 13 | Statistics 季视图 | 季度/月/周按目标 | 100% | 完成 |
| 14 | Statistics 年视图 | 年/季/月/周按目标 | 100% | 完成 |
| 15 | ChartBlock | 支持通用 bucketAccessor | 100% | 完成 |
| 16 | Popover | 点击目标柱显示该目标数据 | 100% | 完成 |
| 17 | 视图创建 | 禁用 Statistics popover quickCreate | 100% | 完成 |
| 18 | 目标分组工具 | 统一 goalPath/goalId/未归属规则 | 100% | 完成 |
| 19 | 控制栏 | 时间周期仍由外部控制栏负责 | 100% | 保持 |
| 20 | 视图筛选 | 目标/主题/Block 仍由视图筛选负责 | 100% | 保持 |
| 21 | 完整 typecheck | 本地依赖环境验证 | 受限 | 待本地执行 |
| 22 | build | 本地构建 main.js | 受限 | 待本地执行 |
