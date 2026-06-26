#!/usr/bin/env node
/**
 * shared-view-convergence-gate
 *
 * Final guard for the shared-view extraction passes.  It intentionally checks
 * only high-value boundaries: large container views, extracted interaction
 * models, and small views that should remain simple instead of being split for
 * symmetry.  Do not add every component here; the point is to prevent obvious
 * regressions without encouraging over-engineering.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(full(relativePath), 'utf8');
}

function lineCount(relativePath) {
  return read(relativePath).split(/\r?\n/).length;
}

function assertExists(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath} is required: ${reason}`);
}

function assertLineLimit(relativePath, maxLines, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath} is missing while checking ${reason}`);
    return;
  }
  const lines = lineCount(relativePath);
  if (lines > maxLines) failures.push(`${relativePath} should stay <= ${maxLines} lines (${reason}); current ${lines}.`);
}

function assertDoesNotContain(relativePath, snippets, reason) {
  if (!exists(relativePath)) return;
  const text = read(relativePath);
  for (const snippet of snippets) {
    if (text.includes(snippet)) failures.push(`${relativePath} must not contain ${snippet} (${reason}).`);
  }
}

const requiredExtractionFiles = [
  ['src/shared/ui/views/HeatmapViewModel.ts', 'Heatmap data helpers extracted in MVP12'],
  ['src/shared/ui/views/HeatmapThemeGroup.tsx', 'Heatmap theme row extracted in MVP12'],
  ['src/shared/ui/views/HeatmapDayView.tsx', 'Heatmap day view extracted in MVP12'],
  ['src/shared/ui/views/HeatmapViewContent.tsx', 'Heatmap content dispatcher extracted in MVP21'],
  ['src/shared/ui/views/HeatmapLayoutModel.ts', 'Heatmap layout state extracted in MVP21'],
  ['src/shared/ui/views/ProgressViewModel.ts', 'Progress model extracted in MVP13'],
  ['src/shared/ui/views/ProgressGoalCard.tsx', 'Progress goal card extracted in MVP13'],
  ['src/shared/ui/views/TimelineView/TimelineViewModel.ts', 'Timeline render model extracted in MVP13'],
  ['src/shared/ui/views/TimelineView/TimelineDailyView.tsx', 'Timeline daily view extracted in MVP21'],
  ['src/shared/ui/views/TimelineView/TimelineDailyViewModel.ts', 'Timeline daily model extracted in MVP21'],
  ['src/shared/ui/views/EventTimelineView/EventTimelineViewModel.ts', 'Event timeline model extracted in MVP15'],
  ['src/shared/ui/views/EventTimelineView/EventTimelineEventList.tsx', 'Event timeline event list extracted in MVP15'],
  ['src/shared/ui/views/TaskExecutionViewModel.ts', 'Task execution model extracted in MVP15'],
  ['src/shared/ui/views/TaskExecutionChipGrid.tsx', 'Task execution chip grid extracted in MVP15'],
  ['src/shared/ui/views/BlockViewModel.ts', 'Block view model extracted in MVP16'],
  ['src/shared/ui/views/BlockViewItemList.tsx', 'Block item list extracted in MVP16'],
  ['src/shared/ui/views/TableViewModel.ts', 'Table view model extracted in MVP16'],
  ['src/shared/ui/views/TableViewCell.tsx', 'Table view cell extracted in MVP16'],
  ['src/shared/ui/views/excel-view/ExcelViewModel.ts', 'Excel view model extracted in MVP14'],
  ['src/shared/ui/views/excel-view/ExcelViewToolbar.tsx', 'Excel toolbar extracted in MVP14'],
  ['src/shared/ui/views/excel-view/ExcelGridModel.ts', 'Excel grid model extracted in MVP17'],
  ['src/shared/ui/views/excel-view/ExcelCellModel.ts', 'Excel cell model extracted in MVP17'],
  ['src/shared/ui/views/excel-view/ExcelCellEditor.tsx', 'Excel cell editor extracted in MVP17'],
  ['src/shared/ui/views/excel-view/ExcelCellContent.tsx', 'Excel cell content extracted in MVP17'],
  ['src/shared/ui/views/excel-view/ExcelCellEditingModel.ts', 'Excel editing model extracted in MVP18'],
  ['src/shared/ui/views/excel-view/ExcelColumnToolbarModel.ts', 'Excel column toolbar model extracted in MVP18'],
  ['src/shared/ui/views/excel-view/ExcelColumnChipList.tsx', 'Excel column chip list extracted in MVP18'],
  ['src/shared/ui/views/StatisticsView/StatisticsViewModel.ts', 'Statistics container model extracted in MVP14'],
  ['src/shared/ui/views/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx', 'Statistics summary strip extracted in MVP20'],
  ['src/shared/ui/views/StatisticsView/views/MonthStatisticsViewModel.ts', 'Month statistics model extracted in MVP20'],
  ['src/shared/ui/views/StatisticsView/views/QuarterStatisticsViewModel.ts', 'Quarter statistics model extracted in MVP20'],
  ['src/shared/ui/views/StatisticsView/views/YearStatisticsViewModel.ts', 'Year statistics model extracted in MVP20'],
  ['src/shared/ui/views/TimeNavigatorModel.ts', 'Time navigator model extracted in MVP19'],
  ['src/shared/ui/views/ViewToolbarModel.ts', 'View toolbar model extracted in MVP19'],
];

for (const [relativePath, reason] of requiredExtractionFiles) assertExists(relativePath, reason);

const viewLineLimits = [
  ['src/shared/ui/views/HeatmapView.tsx', 260, 'Heatmap container should remain orchestration only'],
  ['src/shared/ui/views/HeatmapViewContent.tsx', 140, 'Heatmap content dispatcher should stay lightweight'],
  ['src/shared/ui/views/HeatmapThemeGroup.tsx', 220, 'Heatmap theme group should stay a bounded presentation component'],
  ['src/shared/ui/views/HeatmapDayView.tsx', 140, 'Heatmap day view should stay a bounded presentation component'],
  ['src/shared/ui/views/ProgressView.tsx', 80, 'Progress root should stay a composition shell'],
  ['src/shared/ui/views/TimelineView/TimelineViewContainer.tsx', 120, 'Timeline container should stay a render-model shell'],
  ['src/shared/ui/views/TimelineView/TimelineViewView.tsx', 120, 'Timeline view should delegate daily rendering'],
  ['src/shared/ui/views/TimelineView/TimelineDailyView.tsx', 125, 'Timeline daily view should stay bounded'],
  ['src/shared/ui/views/EventTimelineView/EventTimelineViewContainer.tsx', 120, 'Event timeline container should stay a render-model shell'],
  ['src/shared/ui/views/EventTimelineView/EventTimelineViewView.tsx', 110, 'Event timeline view should delegate list rendering'],
  ['src/shared/ui/views/EventTimelineView/EventTimelineEventList.tsx', 120, 'Event list should stay bounded'],
  ['src/shared/ui/views/TaskExecutionView.tsx', 80, 'Task execution root should stay a state shell'],
  ['src/shared/ui/views/BlockView.tsx', 110, 'Block view should stay a grouped container shell'],
  ['src/shared/ui/views/TableView.tsx', 80, 'Table view should stay a table shell'],
  ['src/shared/ui/views/excel-view/ExcelView.tsx', 200, 'Excel root should stay a toolbar/grid shell'],
  ['src/shared/ui/views/excel-view/ExcelGrid.tsx', 200, 'Excel grid should delegate model-heavy interaction planning'],
  ['src/shared/ui/views/excel-view/ExcelCell.tsx', 180, 'Excel cell should delegate editor/content/model helpers'],
  ['src/shared/ui/views/excel-view/useExcelCellEditing.ts', 240, 'Excel editing hook should delegate planning helpers'],
  ['src/shared/ui/views/excel-view/ExcelColumnToolbar.tsx', 130, 'Excel column toolbar should delegate chip/menu/model helpers'],
  ['src/shared/ui/views/StatisticsView/StatisticsViewContainer.tsx', 190, 'Statistics container should stay a render-model shell'],
  ['src/shared/ui/views/StatisticsView/StatisticsViewView.tsx', 110, 'Statistics view should stay a period-view dispatcher'],
  ['src/shared/ui/views/StatisticsView/views/MonthStatisticsView.tsx', 90, 'Month statistics view should delegate month math'],
  ['src/shared/ui/views/StatisticsView/views/QuarterStatisticsView.tsx', 110, 'Quarter statistics view should delegate quarter math'],
  ['src/shared/ui/views/StatisticsView/views/YearStatisticsView.tsx', 125, 'Year statistics view should delegate year math'],
  ['src/shared/ui/views/TimeNavigator.tsx', 100, 'Time navigator should delegate calendar math'],
  ['src/shared/ui/views/ViewToolbar.tsx', 130, 'View toolbar should delegate date/filter options'],
];

for (const [relativePath, maxLines, reason] of viewLineLimits) assertLineLimit(relativePath, maxLines, reason);

const intentionallyUnsplittedSmallViews = [
  ['src/features/timer/TimerView.tsx', 80, ['src/features/timer/TimerViewModel.ts', 'src/features/timer/TimerViewHeader.tsx']],
  ['src/features/timer/TimerViewView.tsx', 90, ['src/features/timer/TimerViewViewModel.ts']],
  ['src/shared/ui/views/CategoryFilter.tsx', 80, ['src/shared/ui/views/CategoryFilterModel.ts']],
  ['src/shared/ui/views/ThemeFilter.tsx', 80, ['src/shared/ui/views/ThemeFilterModel.ts']],
  ['src/shared/ui/views/StatisticsView/views/DayStatisticsView.tsx', 70, ['src/shared/ui/views/StatisticsView/views/DayStatisticsViewModel.ts']],
  ['src/shared/ui/views/StatisticsView/views/WeekStatisticsView.tsx', 70, ['src/shared/ui/views/StatisticsView/views/WeekStatisticsViewModel.ts']],
];

for (const [relativePath, maxLines, forbiddenSplitFiles] of intentionallyUnsplittedSmallViews) {
  assertLineLimit(relativePath, maxLines, 'intentionally left unsplit to avoid over-engineering');
  for (const splitFile of forbiddenSplitFiles) {
    if (exists(splitFile)) failures.push(`${splitFile} should not be introduced while ${relativePath} remains a small, clear component.`);
  }
}

const localRegressionChecks = [
  ['src/shared/ui/views/HeatmapView.tsx', ['<HeatmapCell', 'const renderContent =', 'const renderThemeGroup ='], 'Heatmap rendering should stay delegated'],
  ['src/shared/ui/views/TimelineView/TimelineViewView.tsx', ['timeline-daily-summary-column', 'timeline-time-axis'], 'Timeline daily internals should stay delegated'],
  ['src/shared/ui/views/excel-view/ExcelGrid.tsx', ['function parseClipboardText', 'function buildFillRange', 'function buildPastePlan'], 'Excel grid planning should stay in ExcelGridModel'],
  ['src/shared/ui/views/excel-view/ExcelCell.tsx', ['function buildCellClassName', 'function getTypedInputProps', 'function isMarkdownInteractiveTarget'], 'Excel cell helper logic should stay in ExcelCellModel'],
  ['src/shared/ui/views/excel-view/ExcelColumnToolbar.tsx', ['function moveItem', 'interface ColumnMenuState', 'class="excel-column-context-menu"'], 'Excel column list/menu should stay delegated'],
  ['src/shared/ui/views/TimeNavigator.tsx', ['getWeeksInYear(', 'getMondayByWeek(', 'getWeekRangeStr('], 'Time navigator calendar math should stay in TimeNavigatorModel'],
  ['src/shared/ui/views/ViewToolbar.tsx', ['const viewOptions =', "'年': 'year'", 'formatDateForView('], 'View toolbar options/date math should stay in ViewToolbarModel'],
  ['src/shared/ui/views/StatisticsView/views/MonthStatisticsView.tsx', ['getMonthWeeksData', 'let weekCursor'], 'Month statistics math should stay in MonthStatisticsViewModel'],
  ['src/shared/ui/views/StatisticsView/views/QuarterStatisticsView.tsx', ['aggregateByQuarter', 'getMonthWeeksData', 'let weekCursor'], 'Quarter statistics math should stay in QuarterStatisticsViewModel'],
  ['src/shared/ui/views/StatisticsView/views/YearStatisticsView.tsx', ['createPeriodData', 'const maxWeeksInMonth'], 'Year statistics math should stay in YearStatisticsViewModel'],
];

for (const [relativePath, snippets, reason] of localRegressionChecks) assertDoesNotContain(relativePath, snippets, reason);

if (failures.length) {
  console.error('[shared-view-convergence-gate] failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[shared-view-convergence-gate] ok: shared views remain extracted without forcing tiny components apart.');
