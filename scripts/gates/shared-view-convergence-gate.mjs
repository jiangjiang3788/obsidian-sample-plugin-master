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
  ['src/features/settings/views/runtime/HeatmapViewModel.ts', 'Heatmap data helpers extracted in MVP12'],
  ['src/features/settings/views/runtime/HeatmapThemeGroup.tsx', 'Heatmap theme row extracted in MVP12'],
  ['src/features/settings/views/runtime/HeatmapDayView.tsx', 'Heatmap day view extracted in MVP12'],
  ['src/features/settings/views/runtime/HeatmapViewContent.tsx', 'Heatmap content dispatcher extracted in MVP21'],
  ['src/features/settings/views/runtime/HeatmapLayoutModel.ts', 'Heatmap layout state extracted in MVP21'],
  ['src/features/settings/views/runtime/ProgressViewModel.ts', 'Progress model extracted in MVP13'],
  ['src/features/settings/views/runtime/ProgressGoalCard.tsx', 'Progress goal card extracted in MVP13'],
  ['src/features/settings/views/runtime/TimelineView/TimelineViewModel.ts', 'Timeline render model extracted in MVP13'],
  ['src/features/settings/views/runtime/TimelineView/TimelineDailyView.tsx', 'Timeline daily view extracted in MVP21'],
  ['src/features/settings/views/runtime/TimelineView/TimelineDailyViewModel.ts', 'Timeline daily model extracted in MVP21'],
  ['src/features/settings/views/runtime/EventTimelineView/EventTimelineViewModel.ts', 'Event timeline model extracted in MVP15'],
  ['src/features/settings/views/runtime/EventTimelineView/EventTimelineEventList.tsx', 'Event timeline event list extracted in MVP15'],
  ['src/features/settings/views/runtime/BlockViewModel.ts', 'Block view model extracted in MVP16'],
  ['src/features/settings/views/runtime/BlockViewItemList.tsx', 'Block item list extracted in MVP16'],
  ['src/features/settings/views/runtime/TableViewModel.ts', 'Table view model extracted in MVP16'],
  ['src/features/settings/views/runtime/TableViewCell.tsx', 'Table view cell extracted in MVP16'],
  ['src/features/settings/views/runtime/excel-view/ExcelViewModel.ts', 'Excel view model extracted in MVP14'],
  ['src/features/settings/views/runtime/excel-view/ExcelViewToolbar.tsx', 'Excel toolbar extracted in MVP14'],
  ['src/features/settings/views/runtime/excel-view/ExcelGridModel.ts', 'Excel grid model extracted in MVP17'],
  ['src/features/settings/views/runtime/excel-view/ExcelCellModel.ts', 'Excel cell model extracted in MVP17'],
  ['src/features/settings/views/runtime/excel-view/ExcelCellEditor.tsx', 'Excel cell editor extracted in MVP17'],
  ['src/features/settings/views/runtime/excel-view/ExcelCellContent.tsx', 'Excel cell content extracted in MVP17'],
  ['src/features/settings/views/runtime/excel-view/ExcelCellEditingModel.ts', 'Excel editing model extracted in MVP18'],
  ['src/features/settings/views/runtime/excel-view/ExcelColumnToolbarModel.ts', 'Excel column toolbar model extracted in MVP18'],
  ['src/features/settings/views/runtime/excel-view/ExcelColumnChipList.tsx', 'Excel column chip list extracted in MVP18'],
  ['src/features/settings/views/runtime/StatisticsView/StatisticsViewModel.ts', 'Statistics container model extracted in MVP14'],
  ['src/features/settings/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx', 'Statistics summary strip extracted in MVP20'],
  ['src/features/settings/views/runtime/StatisticsView/views/MonthStatisticsViewModel.ts', 'Month statistics model extracted in MVP20'],
  ['src/features/settings/views/runtime/StatisticsView/views/QuarterStatisticsViewModel.ts', 'Quarter statistics model extracted in MVP20'],
  ['src/features/settings/views/runtime/StatisticsView/views/YearStatisticsViewModel.ts', 'Year statistics model extracted in MVP20'],
  ['src/features/settings/views/runtime/TimeNavigatorModel.ts', 'Time navigator model extracted in MVP19'],
  ['src/features/settings/views/runtime/ViewToolbarModel.ts', 'View toolbar model extracted in MVP19'],
];

for (const [relativePath, reason] of requiredExtractionFiles) assertExists(relativePath, reason);

const viewLineLimits = [
  ['src/features/settings/views/runtime/HeatmapView.tsx', 260, 'Heatmap container should remain orchestration only'],
  ['src/features/settings/views/runtime/HeatmapViewContent.tsx', 140, 'Heatmap content dispatcher should stay lightweight'],
  ['src/features/settings/views/runtime/HeatmapThemeGroup.tsx', 220, 'Heatmap theme group should stay a bounded presentation component'],
  ['src/features/settings/views/runtime/HeatmapDayView.tsx', 140, 'Heatmap day view should stay a bounded presentation component'],
  ['src/features/settings/views/runtime/ProgressView.tsx', 80, 'Progress root should stay a composition shell'],
  ['src/features/settings/views/runtime/TimelineView/TimelineViewContainer.tsx', 120, 'Timeline container should stay a render-model shell'],
  ['src/features/settings/views/runtime/TimelineView/TimelineViewView.tsx', 120, 'Timeline view should delegate daily rendering'],
  ['src/features/settings/views/runtime/TimelineView/TimelineDailyView.tsx', 125, 'Timeline daily view should stay bounded'],
  ['src/features/settings/views/runtime/EventTimelineView/EventTimelineViewContainer.tsx', 120, 'Event timeline container should stay a render-model shell'],
  ['src/features/settings/views/runtime/EventTimelineView/EventTimelineViewView.tsx', 110, 'Event timeline view should delegate list rendering'],
  ['src/features/settings/views/runtime/EventTimelineView/EventTimelineEventList.tsx', 120, 'Event list should stay bounded'],
  ['src/features/settings/views/runtime/BlockView.tsx', 110, 'Block view should stay a grouped container shell'],
  ['src/features/settings/views/runtime/TableView.tsx', 80, 'Table view should stay a table shell'],
  ['src/features/settings/views/runtime/excel-view/ExcelView.tsx', 200, 'Excel root should stay a toolbar/grid shell'],
  ['src/features/settings/views/runtime/excel-view/ExcelGrid.tsx', 200, 'Excel grid should delegate model-heavy interaction planning'],
  ['src/features/settings/views/runtime/excel-view/ExcelCell.tsx', 180, 'Excel cell should delegate editor/content/model helpers'],
  ['src/features/settings/views/runtime/excel-view/useExcelCellEditing.ts', 240, 'Excel editing hook should delegate planning helpers'],
  ['src/features/settings/views/runtime/excel-view/ExcelColumnToolbar.tsx', 130, 'Excel column toolbar should delegate chip/menu/model helpers'],
  ['src/features/settings/views/runtime/StatisticsView/StatisticsViewContainer.tsx', 190, 'Statistics container should stay a render-model shell'],
  ['src/features/settings/views/runtime/StatisticsView/StatisticsViewView.tsx', 110, 'Statistics view should stay a period-view dispatcher'],
  ['src/features/settings/views/runtime/StatisticsView/views/MonthStatisticsView.tsx', 90, 'Month statistics view should delegate month math'],
  ['src/features/settings/views/runtime/StatisticsView/views/QuarterStatisticsView.tsx', 110, 'Quarter statistics view should delegate quarter math'],
  ['src/features/settings/views/runtime/StatisticsView/views/YearStatisticsView.tsx', 125, 'Year statistics view should delegate year math'],
  ['src/features/settings/views/runtime/TimeNavigator.tsx', 100, 'Time navigator should delegate calendar math'],
  ['src/features/settings/views/runtime/ViewToolbar.tsx', 130, 'View toolbar should delegate date/filter options'],
];

for (const [relativePath, maxLines, reason] of viewLineLimits) assertLineLimit(relativePath, maxLines, reason);

const intentionallyUnsplittedSmallViews = [
  ['src/features/timer/TimerView.tsx', 80, ['src/features/timer/TimerViewModel.ts', 'src/features/timer/TimerViewHeader.tsx']],
  ['src/features/timer/TimerViewView.tsx', 90, ['src/features/timer/TimerViewViewModel.ts']],
  ['src/features/settings/views/runtime/CategoryFilter.tsx', 80, ['src/features/settings/views/runtime/CategoryFilterModel.ts']],
  ['src/features/settings/views/runtime/ThemeFilter.tsx', 80, ['src/features/settings/views/runtime/ThemeFilterModel.ts']],
  ['src/features/settings/views/runtime/StatisticsView/views/DayStatisticsView.tsx', 70, ['src/features/settings/views/runtime/StatisticsView/views/DayStatisticsViewModel.ts']],
  ['src/features/settings/views/runtime/StatisticsView/views/WeekStatisticsView.tsx', 70, ['src/features/settings/views/runtime/StatisticsView/views/WeekStatisticsViewModel.ts']],
];

for (const [relativePath, maxLines, forbiddenSplitFiles] of intentionallyUnsplittedSmallViews) {
  assertLineLimit(relativePath, maxLines, 'intentionally left unsplit to avoid over-engineering');
  for (const splitFile of forbiddenSplitFiles) {
    if (exists(splitFile)) failures.push(`${splitFile} should not be introduced while ${relativePath} remains a small, clear component.`);
  }
}

const localRegressionChecks = [
  ['src/features/settings/views/runtime/HeatmapView.tsx', ['<HeatmapCell', 'const renderContent =', 'const renderThemeGroup ='], 'Heatmap rendering should stay delegated'],
  ['src/features/settings/views/runtime/TimelineView/TimelineViewView.tsx', ['timeline-daily-summary-column', 'timeline-time-axis'], 'Timeline daily internals should stay delegated'],
  ['src/features/settings/views/runtime/excel-view/ExcelGrid.tsx', ['function parseClipboardText', 'function buildFillRange', 'function buildPastePlan'], 'Excel grid planning should stay in ExcelGridModel'],
  ['src/features/settings/views/runtime/excel-view/ExcelCell.tsx', ['function buildCellClassName', 'function getTypedInputProps', 'function isMarkdownInteractiveTarget'], 'Excel cell helper logic should stay in ExcelCellModel'],
  ['src/features/settings/views/runtime/excel-view/ExcelColumnToolbar.tsx', ['function moveItem', 'interface ColumnMenuState', 'class="excel-column-context-menu"'], 'Excel column list/menu should stay delegated'],
  ['src/features/settings/views/runtime/TimeNavigator.tsx', ['getWeeksInYear(', 'getMondayByWeek(', 'getWeekRangeStr('], 'Time navigator calendar math should stay in TimeNavigatorModel'],
  ['src/features/settings/views/runtime/ViewToolbar.tsx', ['const viewOptions =', "'年': 'year'", 'formatDateForView('], 'View toolbar options/date math should stay in ViewToolbarModel'],
  ['src/features/settings/views/runtime/StatisticsView/views/MonthStatisticsView.tsx', ['getMonthWeeksData', 'let weekCursor'], 'Month statistics math should stay in MonthStatisticsViewModel'],
  ['src/features/settings/views/runtime/StatisticsView/views/QuarterStatisticsView.tsx', ['aggregateByQuarter', 'getMonthWeeksData', 'let weekCursor'], 'Quarter statistics math should stay in QuarterStatisticsViewModel'],
  ['src/features/settings/views/runtime/StatisticsView/views/YearStatisticsView.tsx', ['createPeriodData', 'const maxWeeksInMonth'], 'Year statistics math should stay in YearStatisticsViewModel'],
];

for (const [relativePath, snippets, reason] of localRegressionChecks) assertDoesNotContain(relativePath, snippets, reason);

if (failures.length) {
  console.error('[shared-view-convergence-gate] failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[shared-view-convergence-gate] ok: shared views remain extracted without forcing tiny components apart.');
