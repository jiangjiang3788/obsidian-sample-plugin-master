# 单人版收敛 MVP14：逐个视图抽离 - Excel / Statistics

## 背景

用户明确希望后续不要急着做文档治理，而是把视图逐个抽离。MVP12 已处理 Heatmap，MVP13 已处理 Progress / Timeline，本轮继续处理 Excel 与 Statistics。

## 本轮目标

- 不删除文件，继续交付修改/新增完整文件补丁包。
- 将 ExcelView 中的字段推导、列宽归一化、内容展示模式、render model 构造抽出。
- 将 StatisticsViewContainer 中的统计周期结构、年度周结构、popover key 判断等逻辑抽出。
- 加强 single-user gate，防止视图容器重新膨胀。

## 主要改动

### Excel 视图

新增：

- `src/shared/ui/views/excel-view/ExcelViewModel.ts`
- `src/shared/ui/views/excel-view/ExcelViewToolbar.tsx`
- `test/unit/excelViewModel.test.ts`

`ExcelViewModel` 承接：

- `normalizeExcelColumnWidth`
- `normalizeExcelColumnWidths`
- `normalizeExcelContentDisplayMode`
- `getNextExcelContentDisplayMode`
- `buildExcelContentModeButtonTitle`
- `buildExcelViewRenderModel`

`ExcelViewToolbar` 承接：

- legend chips
- content display mode button
- ExcelColumnToolbar 拼装

`ExcelView.tsx` 从约 233 行下降到约 183 行，只保留：

- 本地保存状态
- persist config
- cell editing hook
- Grid / Toolbar 组合

### Statistics 视图

新增：

- `src/shared/ui/views/StatisticsView/StatisticsViewModel.ts`
- `test/unit/statisticsViewModel.test.ts`

`StatisticsViewModel` 承接：

- `buildStatisticsViewConfig`
- `resolveStatisticsStartDate`
- `isStatisticsYearView`
- `resolveStatisticsYear`
- `resolveStatisticsBucketAccessor`
- `buildYearlyWeekStructure`
- `resolveYearlyWeekStructure`
- `buildStatisticsProcessedData`
- `getStatisticsPopoverWidgetId`
- `isSameStatisticsCell`

`StatisticsViewContainer.tsx` 从约 234 行下降到约 176 行，不再直接 import `aggregateByYear / aggregateByQuarter / aggregateByMonth / aggregateByWeek / getWeeksInYear`。

## 验收

已通过：

```bash
npm run single-user:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因仍然是当前环境没有 `node_modules`，缺少 `node / preact / vite/client` 类型定义。

## 下一步

继续逐个视图抽离：

1. EventTimelineView：抽出 EventTimelineViewModel，统一 filteredItems / groupedTree / displayFields fallback。
2. TaskExecutionView：抽出 TaskExecutionViewModel，拆出行/操作区。
3. BlockView / TableView：抽出轻量模型和展示子组件。
4. ExcelCell / ExcelGrid：如果还要更细，可继续拆 cell editor / keyboard / fill drag 子模型。
