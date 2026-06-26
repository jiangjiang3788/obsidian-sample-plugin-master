# 单人版收敛 MVP22：共享视图抽离总收口门禁

## 本轮目标

MVP21 之后，shared view 主体已经完成逐个抽离。MVP22 不再继续机械拆小组件，而是做一次视图抽离总收口：

- 固化已经完成的 Heatmap / Progress / Timeline / EventTimeline / TaskExecution / BlockView / TableView / Excel / Statistics / TimeNavigator / ViewToolbar 抽离成果。
- 将“哪些视图应该保持小而不拆”写进门禁，避免后续为了形式统一继续过度工程化。
- 将 shared view 抽离检查接入 `npm run gate`，防止大文件和本地 helper 回流。

## 为什么本轮不继续拆小视图

本轮盘点后，以下组件已经足够短、职责清楚、没有明显重复派生逻辑，继续抽模型或子组件只会增加跳转成本：

| 文件 | 当前定位 | 决策 |
|---|---|---|
| `src/features/timer/TimerView.tsx` | 计时器容器 | 不拆 |
| `src/features/timer/TimerViewView.tsx` | 计时器展示组件 | 不拆 |
| `src/shared/ui/views/CategoryFilter.tsx` | 分类筛选 popover | 不拆 |
| `src/shared/ui/views/ThemeFilter.tsx` | 主题筛选 popover | 不拆 |
| `src/shared/ui/views/StatisticsView/views/DayStatisticsView.tsx` | 日统计展示 | 不拆 |
| `src/shared/ui/views/StatisticsView/views/WeekStatisticsView.tsx` | 周统计展示 | 不拆 |

这些文件被纳入 `shared-view-convergence-gate` 的“小组件不强拆”名单：要求它们保持短小，同时禁止引入低价值的 `*Model.ts` 拆分文件。

## 新增门禁

新增：

```bash
node scripts/gates/shared-view-convergence-gate.mjs
```

并新增 npm script：

```bash
npm run shared-view-convergence:gate
```

同时将它接入总门禁：

```bash
npm run gate
```

## 门禁覆盖范围

### 1. 抽离成果必须存在

门禁会检查这些关键模型/子组件不能丢失：

- Heatmap：`HeatmapViewModel` / `HeatmapThemeGroup` / `HeatmapDayView` / `HeatmapViewContent` / `HeatmapLayoutModel`
- Progress：`ProgressViewModel` / `ProgressGoalCard`
- Timeline：`TimelineViewModel` / `TimelineDailyView` / `TimelineDailyViewModel`
- EventTimeline：`EventTimelineViewModel` / `EventTimelineEventList`
- TaskExecution：`TaskExecutionViewModel` / `TaskExecutionChipGrid`
- BlockView / TableView：`BlockViewModel` / `BlockViewItemList` / `TableViewModel` / `TableViewCell`
- Excel：`ExcelViewModel` / `ExcelViewToolbar` / `ExcelGridModel` / `ExcelCellModel` / `ExcelCellEditor` / `ExcelCellContent` / `ExcelCellEditingModel` / `ExcelColumnToolbarModel` / `ExcelColumnChipList`
- Statistics：`StatisticsViewModel` / `StatisticsGoalThemeSummaryStrip` / `MonthStatisticsViewModel` / `QuarterStatisticsViewModel` / `YearStatisticsViewModel`
- Shared controls：`TimeNavigatorModel` / `ViewToolbarModel`

### 2. 主视图行数必须保持受控

门禁对主视图保留行数上限，例如：

| 文件 | 上限 | 目的 |
|---|---:|---|
| `HeatmapView.tsx` | 260 | 保持数据装配容器，不回流 cell/theme/day 渲染 |
| `ExcelGrid.tsx` | 200 | 保持 grid shell，不回流粘贴/填充/导航计划 |
| `ExcelCell.tsx` | 180 | 保持单元格 shell，不回流编辑器和状态 helper |
| `useExcelCellEditing.ts` | 240 | 保持 hook 编排，不回流批量计划 helper |
| `StatisticsViewView.tsx` | 110 | 保持周期视图分发，不回流 summary strip |
| `TimelineViewView.tsx` | 120 | 保持 timeline 分发，不回流 daily internals |
| `TimeNavigator.tsx` | 100 | 保持 DOM/点击组合，不回流 calendar math |
| `ViewToolbar.tsx` | 130 | 保持 toolbar 组合，不回流日期/options helper |

### 3. 禁止本地 helper 回流

门禁检查典型回流点，例如：

- `HeatmapView.tsx` 不允许重新直接渲染 `HeatmapCell`。
- `TimelineViewView.tsx` 不允许重新出现 `timeline-time-axis` 这类 daily internals。
- `ExcelGrid.tsx` 不允许重新出现 `parseClipboardText` / `buildFillRange` / `buildPastePlan`。
- `ExcelCell.tsx` 不允许重新出现 `buildCellClassName` / `getTypedInputProps` / `isMarkdownInteractiveTarget`。
- `TimeNavigator.tsx` 不允许重新出现 `getWeeksInYear` / `getMondayByWeek` / `getWeekRangeStr`。
- Statistics 周期视图不允许重新维护 period aggregation / week cursor 等逻辑。

### 4. 防过度工程化名单

门禁同时检查这些小组件保持小而清楚，不新增低价值拆分文件：

- `CategoryFilterModel.ts`
- `ThemeFilterModel.ts`
- `DayStatisticsViewModel.ts`
- `WeekStatisticsViewModel.ts`
- `TimerViewModel.ts`
- `TimerViewViewModel.ts`

这些文件如果出现，门禁会失败，除非未来确实出现新的复杂度并同步调整门禁说明。

## 本轮修改文件

```text
package.json
scripts/gates/shared-view-convergence-gate.mjs
docs/单人版收敛-MVP22.md
docs/Git提交备注-MVP22.md
```

## 验证

已通过：

```bash
npm run single-user:gate
npm run shared-view-convergence:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因仍然是当前环境没有 `node_modules`，缺少：

```text
node
preact
vite/client
```

## 下一步

代码视图抽离已经可以进入收尾阶段。建议下一版做：

1. 最终盘点是否还有非 shared view 的大容器需要轻量收口。
2. 如果没有明显收益，不再继续拆视图。
3. 进入最终封版说明或文档治理。
4. 如果文档治理要删除历史过程文档，则下一版需要交付完整项目包。
