#!/usr/bin/env node
/**
 * single-user-convergence-gate
 *
 * This plugin is maintained for one user and does not need legacy data
 * compatibility. The gate keeps removed dual systems from returning.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const removedPaths = [
  'release/obsidian-sample-plugin',
  'release/obsidian-sample-plugin-release.zip',
  'src/core/theme-matrix',
  'src/core/services/TemplateResolver.ts',
  'src/core/blocks/legacyBlockAdapter.ts',
  'src/features/settings/theme/ThemeMatrix.tsx',
  'src/features/settings/theme/ThemeMatrixView.tsx',
  'src/features/settings/theme/ThemeTable.tsx',
  'src/features/settings/theme/ThemeTreeNodeRow.tsx',
  'src/features/settings/theme/useThemeMatrixEditor.ts',
  'src/features/settings/input/TemplateEditorModal.tsx',
  'src/features/settings/input/goalManager/GoalEntitySection.tsx',
  'src/features/settings/input/goalManager/GoalTemplateSection.tsx',
  'src/features/settings/views/editors/GoalOverviewViewEditor.tsx',
  'src/features/settings/views/editors/GoalDetailViewEditor.tsx',
  'src/features/settings/views/models/goalOverviewViewModel.ts',
  'src/features/settings/views/models/goalDetailViewModel.ts',
  'src/features/views/runtime/GoalOverviewView.tsx',
  'src/features/views/runtime/GoalDetailView.tsx',
  'src/features/views/runtime/ProgressSummaryCards.tsx',
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const removedPath of removedPaths) {
  if (exists(removedPath)) failures.push(`${removedPath} should stay removed in single-user convergence mode.`);
}

const sourceFiles = [];
function walk(relativeDir) {
  const fullDir = path.join(root, relativeDir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(rel);
  }
}
walk('src');
walk('scripts');

const forbiddenRuntimePatterns = [
  { re: /from ['"](?:@\/core\/theme-matrix|@core\/theme-matrix|\.\.?\/.*theme-matrix)/, label: 'imports removed core/theme-matrix module' },
  { re: /\bThemeMatrixService\b/, label: 'uses removed ThemeMatrixService' },
  { re: /\bThemeScanService\b/, label: 'uses removed ThemeScanService' },
  { re: /\bgetAvailableThemesForBlock\b/, label: 'uses removed ThemeOverride availability helper' },
  { re: /\bisThemeDisabledForBlock\b/, label: 'uses removed ThemeOverride disabled helper' },
  { re: /\bGoalOverviewView\b/, label: 'uses removed legacy GoalOverviewView' },
  { re: /\bGoalDetailView\b/, label: 'uses removed legacy GoalDetailView' },
  { re: /from ['\"][^'\"]*services\/TemplateResolver['\"]/, label: 'imports removed TemplateResolver service' },
  { re: /\blegacy-block\b/, label: 'uses removed legacy-block template source' },
  { re: /\blegacyBlockMap\b/, label: 'uses removed legacy block map' },
  { re: /\bbuildLegacyCoreBlockMap\b/, label: 'uses removed legacy block adapter' },
  { re: /\binferCoreBlockIdFromLegacyBlock\b/, label: 'uses removed legacy block adapter' },
];

for (const file of sourceFiles) {
  if (file === 'scripts/gates/checks/single-user-convergence-gate.mjs') continue;
  const text = read(file);
  for (const { re, label } of forbiddenRuntimePatterns) {
    if (re.test(text)) failures.push(`${file}: ${label}`);
  }
}

const publicApi = read('src/core/public.ts');
if (publicApi.includes("./theme-matrix")) failures.push('core/public.ts must not export from ./theme-matrix.');
if (!publicApi.includes("./theme/themePathParser")) failures.push('core/public.ts must export parsePath/getRelativePath from ./theme/themePathParser.');

const viewContent = read('src/app/dashboard/ViewContent.tsx');
if (viewContent.includes('normalizeLegacyGoalViewInstance')) failures.push('ViewContent must not normalize legacy goal view types at runtime.');

if (!exists('src/features/quickinput/editor/QuickInputEditorModel.ts')) {
  failures.push('QuickInputEditor pure model helper must exist after MVP4 extraction.');
}
const quickInputContainer = read('src/features/quickinput/editor/QuickInputEditorContainer.tsx');
const quickInputContainerLines = quickInputContainer.split(/\r?\n/).length;
if (quickInputContainerLines > 350) failures.push(`QuickInputEditorContainer.tsx should stay <= 350 lines after MVP6 action extraction; current ${quickInputContainerLines}.`);

const quickInputModel = read('src/features/quickinput/editor/QuickInputEditorModel.ts');
for (const requiredHelper of [
  'deriveQuickInputInitialSelection',
  'buildQuickInputEditorState',
  'applyQuickInputGoalSelection',
  'preserveQuickInputBlockSwitchState',
  'buildQuickInputDisplayTemplate',
  'applyQuickInputFieldUpdate',
  'applyQuickInputTimeDirectionChange',
]) {
  if (!quickInputModel.includes(requiredHelper)) failures.push(`QuickInputEditorModel.ts must keep ${requiredHelper} after MVP6 extraction.`);
}



if (!exists('src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx')) {
  failures.push('GoalTemplateNativeControls.tsx must exist after MVP6 modal control extraction.');
}
if (!exists('src/features/settings/goalTemplates/GoalTemplateEditorModel.ts')) {
  failures.push('GoalTemplateEditorModel.ts must exist after MVP7 modal model extraction.');
}
const goalTemplateEditorModal = read('src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx');
const goalTemplateEditorModalLines = goalTemplateEditorModal.split(/\r?\n/).length;
if (goalTemplateEditorModalLines > 360) failures.push(`GoalTemplateEditorModal.tsx should stay <= 360 lines after MVP7 model extraction; current ${goalTemplateEditorModalLines}.`);
const goalTemplateEditorModel = read('src/features/settings/goalTemplates/GoalTemplateEditorModel.ts');
for (const requiredHelper of [
  'makeDraftFromTemplate',
  'makeNewDraft',
  'buildTemplatePatchFromDraft',
  'buildInheritedTemplatePatchFromDraft',
  'applyThemePathToDraft',
  'switchDraftToOverride',
  'createCopiedDraft',
]) {
  if (!goalTemplateEditorModel.includes(requiredHelper)) failures.push(`GoalTemplateEditorModel.ts must keep ${requiredHelper} after MVP7 extraction.`);
}


if (!exists('src/features/settings/goalTemplates/GoalTemplateMatrixTable.tsx')) {
  failures.push('GoalTemplateMatrixTable.tsx must exist after MVP8 table extraction.');
}
if (!exists('src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx')) {
  failures.push('GoalTemplateMatrixRow.tsx must exist after MVP9 row extraction.');
}
if (!exists('src/features/settings/goalTemplates/GoalTemplateMatrixCell.tsx')) {
  failures.push('GoalTemplateMatrixCell.tsx must exist after MVP9 cell extraction.');
}
const goalTemplateMatrix = read('src/features/settings/goalTemplates/GoalTemplateMatrix.tsx');
const goalTemplateMatrixLines = goalTemplateMatrix.split(/\r?\n/).length;
if (goalTemplateMatrixLines > 360) failures.push(`GoalTemplateMatrix.tsx should stay <= 360 lines after MVP8 table extraction; current ${goalTemplateMatrixLines}.`);
const goalTemplateMatrixTable = read('src/features/settings/goalTemplates/GoalTemplateMatrixTable.tsx');
const goalTemplateMatrixTableLines = goalTemplateMatrixTable.split(/\r?\n/).length;
if (goalTemplateMatrixTableLines > 140) failures.push(`GoalTemplateMatrixTable.tsx should stay <= 140 lines after MVP9 row/cell extraction; current ${goalTemplateMatrixTableLines}.`);
const goalTemplateMatrixRow = read('src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx');
const goalTemplateMatrixRowLines = goalTemplateMatrixRow.split(/\r?\n/).length;
if (goalTemplateMatrixRowLines > 280) failures.push(`GoalTemplateMatrixRow.tsx should stay <= 280 lines after MVP9 extraction; current ${goalTemplateMatrixRowLines}.`);
const goalTemplateMatrixCell = read('src/features/settings/goalTemplates/GoalTemplateMatrixCell.tsx');
const goalTemplateMatrixCellLines = goalTemplateMatrixCell.split(/\r?\n/).length;
if (goalTemplateMatrixCellLines > 220) failures.push(`GoalTemplateMatrixCell.tsx should stay <= 220 lines after MVP9 extraction; current ${goalTemplateMatrixCellLines}.`);
const goalTemplateMatrixModel = read('src/features/settings/goalTemplates/goalTemplateMatrixModel.ts');
for (const requiredHelper of [
  'filterVisibleGoalTemplateMatrixGoals',
  'orderDraggedGoalSiblings',
  'reorderPresetTemplatesInCell',
  'splitGoalsByRoot',
]) {
  if (!goalTemplateMatrixModel.includes(requiredHelper)) failures.push(`goalTemplateMatrixModel.ts must keep ${requiredHelper} after MVP8 extraction.`);
}



if (!exists('src/core/recordInput/RecordInputFacade.ts')) {
  failures.push('RecordInputFacade.ts must exist after MVP10 input facade extraction.');
}
const recordInputFacade = exists('src/core/recordInput/RecordInputFacade.ts') ? read('src/core/recordInput/RecordInputFacade.ts') : '';
for (const requiredHelper of [
  'findMissingRecordInputRequiredFields',
  'buildRecordCreateDraftFromEditorState',
  'buildCreateRecordSubmitParamsFromEditorState',
  'buildUpdateRecordSubmitParamsFromEditorState',
  'normalizeRecordInputFormDataForTemplate',
  'buildBatchCreateRecordSubmitResult',
]) {
  if (!recordInputFacade.includes(requiredHelper)) failures.push(`RecordInputFacade.ts must keep ${requiredHelper} after MVP10 extraction.`);
}
const quickInputSubmit = read('src/features/quickinput/modal/useQuickInputSubmit.ts');
for (const forbiddenLocal of ['function hasRequiredValue', 'function findMissingRequiredFields']) {
  if (quickInputSubmit.includes(forbiddenLocal)) failures.push(`useQuickInputSubmit.ts must not keep local ${forbiddenLocal} after RecordInputFacade extraction.`);
}
const aiBatchConfirm = read('src/platform/obsidian/modals/AiBatchConfirmModal.tsx');
for (const forbiddenLocal of ['function normalizeAiFieldValue', 'function normalizeAiFormData', 'const buildBatchCreateResult']) {
  if (aiBatchConfirm.includes(forbiddenLocal)) failures.push(`AiBatchConfirmModal.tsx must not keep local ${forbiddenLocal} after RecordInputFacade extraction.`);
}
if ((aiBatchConfirm.match(/const isActive = index === currentIndex/g) || []).length > 1) {
  failures.push('AiBatchConfirmModal.tsx must not contain duplicated isActive declarations.');
}
if (!exists('src/platform/obsidian/modals/AiBatchConfirmModel.ts')) {
  failures.push('AiBatchConfirmModel.ts must exist after MVP11 AI batch model extraction.');
}
if (!exists('src/platform/obsidian/modals/AiBatchConfirmSidebar.tsx')) {
  failures.push('AiBatchConfirmSidebar.tsx must exist after MVP11 sidebar extraction.');
}
if (!exists('src/platform/obsidian/modals/AiBatchConfirmRecordHeader.tsx')) {
  failures.push('AiBatchConfirmRecordHeader.tsx must exist after MVP11 header extraction.');
}
if (!exists('src/platform/obsidian/modals/AiBatchConfirmFooter.tsx')) {
  failures.push('AiBatchConfirmFooter.tsx must exist after MVP11 footer extraction.');
}
const aiBatchConfirmLines = aiBatchConfirm.split(/\r?\n/).length;
if (aiBatchConfirmLines > 280) failures.push(`AiBatchConfirmModal.tsx should stay <= 280 lines after MVP11 model/component extraction; current ${aiBatchConfirmLines}.`);
if (exists('src/platform/obsidian/modals/AiBatchConfirmModel.ts')) {
  const aiBatchConfirmModel = read('src/platform/obsidian/modals/AiBatchConfirmModel.ts');
  for (const requiredHelper of [
    'buildAiBatchConfirmRecordItems',
    'resolveGoalForAiTarget',
    'resolvePresetForAiTarget',
    'buildAiBatchConfirmCreateSubmitParams',
    'summarizeAiBatchConfirmRecords',
  ]) {
    if (!aiBatchConfirmModel.includes(requiredHelper)) failures.push(`AiBatchConfirmModel.ts must keep ${requiredHelper} after MVP11 extraction.`);
  }
}
for (const forbiddenLocal of [
  'function resolveGoalForAiTarget',
  'function resolvePresetForAiTarget',
  'function readPresetThemePath',
  'function shortDisplay',
  'function presetDisplayName',
  'function goalDisplayName',
]) {
  if (aiBatchConfirm.includes(forbiddenLocal)) failures.push(`AiBatchConfirmModal.tsx must not keep local ${forbiddenLocal} after AiBatchConfirmModel extraction.`);
}


if (!exists('src/features/views/runtime/HeatmapViewModel.ts')) {
  failures.push('HeatmapViewModel.ts must exist after MVP12 heatmap render model extraction.');
}
if (!exists('src/features/views/runtime/HeatmapThemeGroup.tsx')) {
  failures.push('HeatmapThemeGroup.tsx must exist after MVP12 heatmap theme group extraction.');
}
if (!exists('src/features/views/runtime/HeatmapDayView.tsx')) {
  failures.push('HeatmapDayView.tsx must exist after MVP12 heatmap day view extraction.');
}
if (!exists('src/features/views/runtime/HeatmapViewContent.tsx')) {
  failures.push('HeatmapViewContent.tsx must exist after MVP21 heatmap content extraction.');
}
if (!exists('src/features/views/runtime/HeatmapLayoutModel.ts')) {
  failures.push('HeatmapLayoutModel.ts must exist after MVP21 heatmap layout model extraction.');
}
const heatmapView = read('src/features/views/runtime/HeatmapView.tsx');
const heatmapViewLines = heatmapView.split(/\r?\n/).length;
if (heatmapViewLines > 260) failures.push(`HeatmapView.tsx should stay <= 260 lines after MVP21 content/layout extraction; current ${heatmapViewLines}.`);
if (heatmapView.includes('<HeatmapCell')) failures.push('HeatmapView.tsx must not directly render HeatmapCell after MVP12 split.');
if (heatmapView.includes('const renderContent =')) failures.push('HeatmapView.tsx must not keep local renderContent after MVP21 content extraction.');
if (heatmapView.includes('const renderThemeGroup =')) failures.push('HeatmapView.tsx must not keep local renderThemeGroup after MVP21 content extraction.');
const heatmapViewContent = read('src/features/views/runtime/HeatmapViewContent.tsx');
const heatmapViewContentLines = heatmapViewContent.split(/\r?\n/).length;
if (heatmapViewContentLines > 140) failures.push(`HeatmapViewContent.tsx should stay <= 140 lines after MVP21 extraction; current ${heatmapViewContentLines}.`);
const heatmapLayoutModel = read('src/features/views/runtime/HeatmapLayoutModel.ts');
for (const requiredHelper of [
  'resolveHeatmapVerticalLayout',
  'applyHeatmapVerticalLayout',
  'toggleHeatmapCollapsedTheme',
]) {
  if (!heatmapLayoutModel.includes(requiredHelper)) failures.push(`HeatmapLayoutModel.ts must keep ${requiredHelper} after MVP21 extraction.`);
}
const heatmapThemeGroup = read('src/features/views/runtime/HeatmapThemeGroup.tsx');
const heatmapThemeGroupLines = heatmapThemeGroup.split(/\r?\n/).length;
if (heatmapThemeGroupLines > 220) failures.push(`HeatmapThemeGroup.tsx should stay <= 220 lines after MVP12 split; current ${heatmapThemeGroupLines}.`);
const heatmapDayView = read('src/features/views/runtime/HeatmapDayView.tsx');
const heatmapDayViewLines = heatmapDayView.split(/\r?\n/).length;
if (heatmapDayViewLines > 140) failures.push(`HeatmapDayView.tsx should stay <= 140 lines after MVP12 split; current ${heatmapDayViewLines}.`);
const heatmapViewModel = read('src/features/views/runtime/HeatmapViewModel.ts');
for (const requiredHelper of [
  'normalizeHeatmapBlockId',
  'inferHeatmapBlockIdByTheme',
  'resolveHeatmapCreateBlockId',
  'buildDayThemeGroups',
]) {
  if (!heatmapViewModel.includes(requiredHelper)) failures.push(`HeatmapViewModel.ts must keep ${requiredHelper} after MVP12 extraction.`);
}



if (!exists('src/features/views/runtime/ProgressViewModel.ts')) {
  failures.push('ProgressViewModel.ts must exist after MVP13 progress render model extraction.');
}
if (!exists('src/features/views/runtime/ProgressGoalCard.tsx')) {
  failures.push('ProgressGoalCard.tsx must exist after MVP13 progress card extraction.');
}const progressView = read('src/features/views/runtime/ProgressView.tsx');
const progressViewLines = progressView.split(/\r?\n/).length;
if (progressViewLines > 80) failures.push(`ProgressView.tsx should stay <= 80 lines after MVP13 component split; current ${progressViewLines}.`);
for (const forbiddenLocal of ['function GoalProgressCard', 'function ProgressBar', 'function ThemeBreakdownList', 'function BlockCountGrid']) {
  if (progressView.includes(forbiddenLocal)) failures.push(`ProgressView.tsx must not keep local ${forbiddenLocal} after MVP13 split.`);
}
const progressViewModel = read('src/features/views/runtime/ProgressViewModel.ts');
for (const requiredHelper of [
  'buildProgressSummary',
  'buildProgressBlockCountRows',
  'buildProgressCollapsedFacts',
  'getVisibleProgressThemeBreakdown',
]) {
  if (!progressViewModel.includes(requiredHelper)) failures.push(`ProgressViewModel.ts must keep ${requiredHelper} after MVP13 extraction.`);
}

if (!exists('src/features/views/runtime/TimelineView/TimelineViewModel.ts')) {
  failures.push('TimelineViewModel.ts must exist after MVP13 timeline fallback model extraction.');
}
if (!exists('src/features/views/runtime/TimelineView/TimelineDailyView.tsx')) {
  failures.push('TimelineDailyView.tsx must exist after MVP21 daily timeline extraction.');
}
if (!exists('src/features/views/runtime/TimelineView/TimelineDailyViewModel.ts')) {
  failures.push('TimelineDailyViewModel.ts must exist after MVP21 daily timeline model extraction.');
}
const timelineViewContainer = read('src/features/views/runtime/TimelineView/TimelineViewContainer.tsx');
const timelineViewContainerLines = timelineViewContainer.split(/\r?\n/).length;
if (timelineViewContainerLines > 120) failures.push(`TimelineViewContainer.tsx should stay <= 120 lines after MVP13 model extraction; current ${timelineViewContainerLines}.`);
for (const forbiddenLocal of ['processItemsToTimelineTasks', 'buildMonthlyAndWeeklySummary', 'buildSummaryCategoryHours', 'buildDailyViewData', 'filterByRules']) {
  if (timelineViewContainer.includes(forbiddenLocal)) failures.push(`TimelineViewContainer.tsx must not keep local ${forbiddenLocal} after MVP13 TimelineViewModel extraction.`);
}
const timelineViewView = read('src/features/views/runtime/TimelineView/TimelineViewView.tsx');
const timelineViewViewLines = timelineViewView.split(/\r?\n/).length;
if (timelineViewViewLines > 120) failures.push(`TimelineViewView.tsx should stay <= 120 lines after MVP21 daily view extraction; current ${timelineViewViewLines}.`);
if (timelineViewView.includes('<DayColumnHeader') || timelineViewView.includes('<DayColumnBody') || timelineViewView.includes('<ProgressBlock')) {
  failures.push('TimelineViewView.tsx must not directly render daily timeline internals after MVP21 extraction.');
}
const timelineDailyView = read('src/features/views/runtime/TimelineView/TimelineDailyView.tsx');
const timelineDailyViewLines = timelineDailyView.split(/\r?\n/).length;
if (timelineDailyViewLines > 125) failures.push(`TimelineDailyView.tsx should stay <= 125 lines after MVP21 extraction; current ${timelineDailyViewLines}.`);
const timelineDailyViewModel = read('src/features/views/runtime/TimelineView/TimelineDailyViewModel.ts');
for (const requiredHelper of ['buildTimelineDayColumns', 'buildTimelineTimeAxisRows']) {
  if (!timelineDailyViewModel.includes(requiredHelper)) failures.push(`TimelineDailyViewModel.ts must keep ${requiredHelper} after MVP21 extraction.`);
}

const timelineViewModel = read('src/features/views/runtime/TimelineView/TimelineViewModel.ts');
for (const requiredHelper of [
  'buildTimelineRenderModel',
  'resolveTimelineConfig',
  'buildTimelineColorMap',
  'resolveTimelineTasks',
  'buildTimelineSummaryData',
]) {
  if (!timelineViewModel.includes(requiredHelper)) failures.push(`TimelineViewModel.ts must keep ${requiredHelper} after MVP13 extraction.`);
}



if (!exists('src/features/views/runtime/excel-view/ExcelViewModel.ts')) {
  failures.push('ExcelViewModel.ts must exist after MVP14 Excel view model extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelViewToolbar.tsx')) {
  failures.push('ExcelViewToolbar.tsx must exist after MVP14 Excel toolbar extraction.');
}
const excelView = read('src/features/views/runtime/excel-view/ExcelView.tsx');
const excelViewLines = excelView.split(/\r?\n/).length;
if (excelViewLines > 210) failures.push(`excel-view/ExcelView.tsx should stay <= 210 lines after MVP14 model/toolbar extraction; current ${excelViewLines}.`);
for (const forbiddenLocal of ['function normalizeColumnWidth', 'function normalizeColumnWidths', 'function normalizeContentDisplayMode', 'function getNextContentDisplayMode']) {
  if (excelView.includes(forbiddenLocal)) failures.push(`excel-view/ExcelView.tsx must not keep local ${forbiddenLocal} after MVP14 ExcelViewModel extraction.`);
}
const excelViewModel = read('src/features/views/runtime/excel-view/ExcelViewModel.ts');
for (const requiredHelper of [
  'buildExcelViewRenderModel',
  'normalizeExcelColumnWidth',
  'normalizeExcelColumnWidths',
  'normalizeExcelContentDisplayMode',
  'buildExcelContentModeButtonTitle',
]) {
  if (!excelViewModel.includes(requiredHelper)) failures.push(`ExcelViewModel.ts must keep ${requiredHelper} after MVP14 extraction.`);
}

if (!exists('src/features/views/runtime/StatisticsView/StatisticsViewModel.ts')) {
  failures.push('StatisticsViewModel.ts must exist after MVP14 statistics model extraction.');
}
const statisticsViewContainer = read('src/features/views/runtime/StatisticsView/StatisticsViewContainer.tsx');
const statisticsViewContainerLines = statisticsViewContainer.split(/\r?\n/).length;
if (statisticsViewContainerLines > 190) failures.push(`StatisticsViewContainer.tsx should stay <= 190 lines after MVP14 model extraction; current ${statisticsViewContainerLines}.`);
for (const forbiddenLocal of ['aggregateByYear', 'aggregateByQuarter', 'aggregateByMonth', 'aggregateByWeek', 'getWeeksInYear']) {
  if (statisticsViewContainer.includes(forbiddenLocal)) failures.push(`StatisticsViewContainer.tsx must not keep local ${forbiddenLocal} after StatisticsViewModel extraction.`);
}
const statisticsViewModel = read('src/features/views/runtime/StatisticsView/StatisticsViewModel.ts');
for (const requiredHelper of [
  'buildStatisticsProcessedData',
  'buildYearlyWeekStructure',
  'resolveYearlyWeekStructure',
  'buildStatisticsViewConfig',
  'getStatisticsPopoverWidgetId',
]) {
  if (!statisticsViewModel.includes(requiredHelper)) failures.push(`StatisticsViewModel.ts must keep ${requiredHelper} after MVP14 extraction.`);
}


if (!exists('src/features/views/runtime/EventTimelineView/EventTimelineViewModel.ts')) {
  failures.push('EventTimelineViewModel.ts must exist after MVP15 event timeline extraction.');
}
if (!exists('src/features/views/runtime/EventTimelineView/EventTimelineEventList.tsx')) {
  failures.push('EventTimelineEventList.tsx must exist after MVP15 event list extraction.');
}
const eventTimelineContainer = read('src/features/views/runtime/EventTimelineView/EventTimelineViewContainer.tsx');
const eventTimelineContainerLines = eventTimelineContainer.split(/\r?\n/).length;
if (eventTimelineContainerLines > 120) failures.push(`EventTimelineViewContainer.tsx should stay <= 120 lines after MVP15 model extraction; current ${eventTimelineContainerLines}.`);
const eventTimelineView = read('src/features/views/runtime/EventTimelineView/EventTimelineViewView.tsx');
const eventTimelineViewLines = eventTimelineView.split(/\r?\n/).length;
if (eventTimelineViewLines > 120) failures.push(`EventTimelineViewView.tsx should stay <= 120 lines after MVP15 event list extraction; current ${eventTimelineViewLines}.`);
for (const forbiddenLocal of ['function getItemTime', 'const getItemTime', 'function cleanDisplayText', 'const cleanDisplayText', 'function getTaskDisplayTitle', 'const getTaskDisplayTitle']) {
  if (eventTimelineContainer.includes(forbiddenLocal) || eventTimelineView.includes(forbiddenLocal)) failures.push(`EventTimeline view files must not keep local ${forbiddenLocal} after MVP15 extraction.`);
}
const eventTimelineModel = read('src/features/views/runtime/EventTimelineView/EventTimelineViewModel.ts');
for (const requiredHelper of [
  'buildEventTimelineRenderModel',
  'filterEventTimelineItemsByDateRange',
  'buildEventTimelineGroupedTree',
  'getEventTimelineTaskDisplayTitle',
]) {
  if (!eventTimelineModel.includes(requiredHelper)) failures.push(`EventTimelineViewModel.ts must keep ${requiredHelper} after MVP15 extraction.`);
}

// 1.0.32: TaskExecutionView retired; EnergyTaskList is the single task surface.
if (!exists('src/features/views/runtime/BlockViewModel.ts')) {
  failures.push('BlockViewModel.ts must exist after MVP16 block view extraction.');
}
if (!exists('src/features/views/runtime/BlockViewItemList.tsx')) {
  failures.push('BlockViewItemList.tsx must exist after MVP16 block item list extraction.');
}
const blockView = read('src/features/views/runtime/BlockView.tsx');
const blockViewLines = blockView.split(/\r?\n/).length;
if (blockViewLines > 110) failures.push(`BlockView.tsx should stay <= 110 lines after MVP16 model/item-list split; current ${blockViewLines}.`);
for (const forbiddenLocal of ['const renderItem =', 'function renderItem', 'groupItemsByFields', 'timers.find']) {
  if (blockView.includes(forbiddenLocal)) failures.push(`BlockView.tsx must not keep local ${forbiddenLocal} after MVP16 extraction.`);
}
const blockViewModel = read('src/features/views/runtime/BlockViewModel.ts');
for (const requiredHelper of [
  'resolveBlockViewGroupFields',
  'buildBlockViewRenderModel',
  'findBlockViewTimer',
  'buildBlockViewGroupClassNames',
]) {
  if (!blockViewModel.includes(requiredHelper)) failures.push(`BlockViewModel.ts must keep ${requiredHelper} after MVP16 extraction.`);
}
const blockViewItemList = read('src/features/views/runtime/BlockViewItemList.tsx');
if (!blockViewItemList.includes('TaskRow') || !blockViewItemList.includes('BlockItem')) {
  failures.push('BlockViewItemList.tsx must own TaskRow/BlockItem rendering after MVP16 extraction.');
}

if (!exists('src/features/views/runtime/TableViewModel.ts')) {
  failures.push('TableViewModel.ts must exist after MVP16 table view extraction.');
}
if (!exists('src/features/views/runtime/TableViewCell.tsx')) {
  failures.push('TableViewCell.tsx must exist after MVP16 table cell extraction.');
}
const tableView = read('src/features/views/runtime/TableView.tsx');
const tableViewLines = tableView.split(/\r?\n/).length;
if (tableViewLines > 80) failures.push(`TableView.tsx should stay <= 80 lines after MVP16 model/cell split; current ${tableViewLines}.`);
for (const forbiddenLocal of ['buildTableMatrix', 'function renderCellItem', 'const renderCellItem', 'timers.find']) {
  if (tableView.includes(forbiddenLocal)) failures.push(`TableView.tsx must not keep local ${forbiddenLocal} after MVP16 extraction.`);
}
const tableViewModel = read('src/features/views/runtime/TableViewModel.ts');
for (const requiredHelper of [
  'buildTableViewRenderModel',
  'isTableViewConfigured',
  'getTableViewEmptyMessage',
  'findTableViewTimer',
]) {
  if (!tableViewModel.includes(requiredHelper)) failures.push(`TableViewModel.ts must keep ${requiredHelper} after MVP16 extraction.`);
}
const tableViewCell = read('src/features/views/runtime/TableViewCell.tsx');
if (!tableViewCell.includes('TaskRow') || !tableViewCell.includes('ItemLink')) {
  failures.push('TableViewCell.tsx must own TaskRow/ItemLink rendering after MVP16 extraction.');
}


if (!exists('src/features/views/runtime/excel-view/ExcelGridModel.ts')) {
  failures.push('ExcelGridModel.ts must exist after MVP17 ExcelGrid interaction model extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelCellModel.ts')) {
  failures.push('ExcelCellModel.ts must exist after MVP17 ExcelCell interaction model extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelCellEditor.tsx')) {
  failures.push('ExcelCellEditor.tsx must exist after MVP17 ExcelCell editor extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelCellContent.tsx')) {
  failures.push('ExcelCellContent.tsx must exist after MVP17 ExcelCell content extraction.');
}
const excelGrid = read('src/features/views/runtime/excel-view/ExcelGrid.tsx');
const excelGridLines = excelGrid.split(/\r?\n/).length;
if (excelGridLines > 210) failures.push(`ExcelGrid.tsx should stay <= 210 lines after MVP17 grid model extraction; current ${excelGridLines}.`);
for (const forbiddenLocal of [
  'function getColumnBadge',
  'function getColumnTitle',
  'function getColumnWidth',
  'function parseClipboardMatrix',
  'function buildFillRange',
  'function findCellPosition',
]) {
  if (excelGrid.includes(forbiddenLocal)) failures.push(`ExcelGrid.tsx must not keep local ${forbiddenLocal} after MVP17 extraction.`);
}
const excelCell = read('src/features/views/runtime/excel-view/ExcelCell.tsx');
const excelCellLines = excelCell.split(/\r?\n/).length;
if (excelCellLines > 200) failures.push(`ExcelCell.tsx should stay <= 200 lines after MVP17 cell model/editor/content extraction; current ${excelCellLines}.`);
for (const forbiddenLocal of [
  'function readKeyboardValue',
  'function getReadonlyTitle',
  'function getTypedInputProps',
  'function isMarkdownInteractiveTarget',
]) {
  if (excelCell.includes(forbiddenLocal)) failures.push(`ExcelCell.tsx must not keep local ${forbiddenLocal} after MVP17 extraction.`);
}
const excelGridModel = read('src/features/views/runtime/excel-view/ExcelGridModel.ts');
for (const requiredHelper of [
  'getExcelColumnWidth',
  'parseExcelClipboardMatrix',
  'buildExcelGridCell',
  'resolveExcelNavigationPosition',
  'buildExcelFillRange',
  'buildExcelPastePlan',
]) {
  if (!excelGridModel.includes(requiredHelper)) failures.push(`ExcelGridModel.ts must keep ${requiredHelper} after MVP17 extraction.`);
}
const excelCellModel = read('src/features/views/runtime/excel-view/ExcelCellModel.ts');
for (const requiredHelper of [
  'buildExcelCellUiState',
  'resolveExcelCellEditorKeyAction',
  'resolveExcelCellKeyAction',
  'getExcelTypedInputProps',
  'isExcelMarkdownInteractiveTarget',
]) {
  if (!excelCellModel.includes(requiredHelper)) failures.push(`ExcelCellModel.ts must keep ${requiredHelper} after MVP17 extraction.`);
}


if (!exists('src/features/views/runtime/excel-view/ExcelCellEditingModel.ts')) {
  failures.push('ExcelCellEditingModel.ts must exist after MVP18 useExcelCellEditing extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelColumnToolbarModel.ts')) {
  failures.push('ExcelColumnToolbarModel.ts must exist after MVP18 column toolbar model extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelColumnChipList.tsx')) {
  failures.push('ExcelColumnChipList.tsx must exist after MVP18 column chip list extraction.');
}
if (!exists('src/features/views/runtime/excel-view/ExcelColumnContextMenu.tsx')) {
  failures.push('ExcelColumnContextMenu.tsx must exist after MVP18 column context menu extraction.');
}
const useExcelCellEditing = read('src/features/views/runtime/excel-view/useExcelCellEditing.ts');
const useExcelCellEditingLines = useExcelCellEditing.split(/\r?\n/).length;
if (useExcelCellEditingLines > 240) failures.push(`useExcelCellEditing.ts should stay <= 240 lines after MVP18 editing model extraction; current ${useExcelCellEditingLines}.`);
for (const forbiddenLocal of [
  'function addPendingKey',
  'function addPendingKeys',
  'function removePendingKey',
  'function removePendingKeys',
  'function uniqueKeys',
  'validateExcelEditorValue(edit.cell',
  'parseExcelEditorValue(edit.cell',
]) {
  if (useExcelCellEditing.includes(forbiddenLocal)) failures.push(`useExcelCellEditing.ts must not keep local ${forbiddenLocal} after MVP18 extraction.`);
}
const excelCellEditingModel = read('src/features/views/runtime/excel-view/ExcelCellEditingModel.ts');
for (const requiredHelper of [
  'buildExcelCellCommitPlan',
  'buildExcelSingleCellEditPlan',
  'buildExcelFillDragBatchEdits',
  'addExcelSetValues',
  'removeExcelSetValues',
]) {
  if (!excelCellEditingModel.includes(requiredHelper)) failures.push(`ExcelCellEditingModel.ts must keep ${requiredHelper} after MVP18 extraction.`);
}
const excelColumnToolbar = read('src/features/views/runtime/excel-view/ExcelColumnToolbar.tsx');
const excelColumnToolbarLines = excelColumnToolbar.split(/\r?\n/).length;
if (excelColumnToolbarLines > 130) failures.push(`ExcelColumnToolbar.tsx should stay <= 130 lines after MVP18 model/chip/menu extraction; current ${excelColumnToolbarLines}.`);
for (const forbiddenLocal of [
  'function moveItem',
  'interface ColumnMenuState',
  'fields.map((field) => {',
  'class="excel-column-context-menu"',
]) {
  if (excelColumnToolbar.includes(forbiddenLocal)) failures.push(`ExcelColumnToolbar.tsx must not keep local ${forbiddenLocal} after MVP18 extraction.`);
}
const excelColumnToolbarModel = read('src/features/views/runtime/excel-view/ExcelColumnToolbarModel.ts');
for (const requiredHelper of [
  'moveExcelColumnField',
  'buildExcelColumnAvailableOptions',
  'buildExcelColumnMenuModel',
  'reorderExcelColumnFieldsByDrop',
]) {
  if (!excelColumnToolbarModel.includes(requiredHelper)) failures.push(`ExcelColumnToolbarModel.ts must keep ${requiredHelper} after MVP18 extraction.`);
}


// TimeNavigator runtime/model were physically removed after the runtime stopped consuming them.

if (!exists('src/features/views/runtime/ViewToolbarModel.ts')) {
  failures.push('ViewToolbarModel.ts must exist after MVP19 view toolbar model extraction.');
}
const viewToolbar = read('src/features/views/runtime/ViewToolbar.tsx');
const viewToolbarLines = viewToolbar.split(/\r?\n/).length;
if (viewToolbarLines > 130) failures.push(`ViewToolbar.tsx should stay <= 130 lines after MVP19 model extraction; current ${viewToolbarLines}.`);
for (const forbiddenLocal of [
  'const viewOptions =',
  'const unit = useMemo',
  "'年': 'year'",
  'formatDateForView(',
]) {
  if (viewToolbar.includes(forbiddenLocal)) failures.push(`ViewToolbar.tsx must not keep local ${forbiddenLocal} after MVP19 extraction.`);
}
const viewToolbarModel = read('src/features/views/runtime/ViewToolbarModel.ts');
for (const requiredHelper of [
  'VIEW_TOOLBAR_OPTIONS',
  'getViewToolbarUnit',
  'buildViewToolbarDateTargets',
  'shouldRenderViewToolbarFallbackFilters',
]) {
  if (!viewToolbarModel.includes(requiredHelper)) failures.push(`ViewToolbarModel.ts must keep ${requiredHelper} after MVP19 extraction.`);
}


if (!exists('src/features/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx')) {
  failures.push('StatisticsGoalThemeSummaryStrip.tsx must exist after MVP20 statistics summary strip extraction.');
}
for (const periodModel of [
  'src/features/views/runtime/StatisticsView/views/MonthStatisticsViewModel.ts',
  'src/features/views/runtime/StatisticsView/views/QuarterStatisticsViewModel.ts',
  'src/features/views/runtime/StatisticsView/views/YearStatisticsViewModel.ts',
]) {
  if (!exists(periodModel)) failures.push(`${periodModel} must exist after MVP20 statistics period model extraction.`);
}
const statisticsViewView = read('src/features/views/runtime/StatisticsView/StatisticsViewView.tsx');
const statisticsViewViewLines = statisticsViewView.split(/\r?\n/).length;
if (statisticsViewViewLines > 110) failures.push(`StatisticsViewView.tsx should stay <= 110 lines after MVP20 summary strip extraction; current ${statisticsViewViewLines}.`);
if (statisticsViewView.includes('function GoalThemeSummaryStrip')) failures.push('StatisticsViewView.tsx must not keep inline GoalThemeSummaryStrip after MVP20 extraction.');
const periodStatisticsView = read('src/features/views/runtime/StatisticsView/views/PeriodStatisticsView.tsx');
const periodStatisticsViewLines = periodStatisticsView.split(/\r?\n/).length;
if (periodStatisticsViewLines > 120) failures.push(`PeriodStatisticsView.tsx should stay <= 120 lines after physical consolidation; current ${periodStatisticsViewLines}.`);
for (const requiredMarker of ['MonthStatisticsViewModel', 'QuarterStatisticsViewModel', 'YearStatisticsViewModel']) {
  if (!periodStatisticsView.includes(requiredMarker)) failures.push(`PeriodStatisticsView.tsx must keep ${requiredMarker} integration after physical consolidation.`);
}
const statisticsGoalThemeSummaryStrip = read('src/features/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx');
for (const requiredHelper of [
  'getStatisticsGoalThemeSummaryRows',
  'getStatisticsGoalThemeSummaryLabel',
  'getStatisticsGoalThemeSummaryTitle',
  'getStatisticsGoalThemeSummaryText',
]) {
  if (!statisticsGoalThemeSummaryStrip.includes(requiredHelper)) failures.push(`StatisticsGoalThemeSummaryStrip.tsx must keep ${requiredHelper} after MVP20 extraction.`);
}
const monthStatisticsViewModel = read('src/features/views/runtime/StatisticsView/views/MonthStatisticsViewModel.ts');
for (const requiredHelper of ['buildMonthWeekMeta', 'buildMonthStatisticsRenderModel']) {
  if (!monthStatisticsViewModel.includes(requiredHelper)) failures.push(`MonthStatisticsViewModel.ts must keep ${requiredHelper} after MVP20 extraction.`);
}
const quarterStatisticsViewModel = read('src/features/views/runtime/StatisticsView/views/QuarterStatisticsViewModel.ts');
for (const requiredHelper of ['buildQuarterMonthWeekStarts', 'buildQuarterStatisticsRenderModel']) {
  if (!quarterStatisticsViewModel.includes(requiredHelper)) failures.push(`QuarterStatisticsViewModel.ts must keep ${requiredHelper} after MVP20 extraction.`);
}
const yearStatisticsViewModel = read('src/features/views/runtime/StatisticsView/views/YearStatisticsViewModel.ts');
for (const requiredHelper of ['getYearStatisticsMaxWeeksInMonth', 'buildYearStatisticsRenderModel']) {
  if (!yearStatisticsViewModel.includes(requiredHelper)) failures.push(`YearStatisticsViewModel.ts must keep ${requiredHelper} after MVP20 extraction.`);
}


const settingsSchema = read('src/core/settings/ThinkSettings.ts');
const captureSchema = read('src/core/recordInput/CaptureTemplate.ts');
const singleUserSchema = `${settingsSchema}\n${captureSchema}`;
if (/interface\s+ThemeOverride\b/.test(singleUserSchema)) failures.push('current settings/capture contracts must not define ThemeOverride in single-user mode.');
if (/inputSettings:\s*\{[^}]*overrides/s.test(singleUserSchema)) failures.push('DEFAULT_SETTINGS.inputSettings must not contain overrides.');
if (/overrides:\s*ThemeOverride\[\]/.test(singleUserSchema)) failures.push('InputSettings must not expose overrides.');


const encodedDocNames = [];
function walkNames(relativeDir) {
  const fullDir = path.join(root, relativeDir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    if (/#U[0-9A-Fa-f]{4}/.test(entry.name)) encodedDocNames.push(rel);
    if (entry.isDirectory()) walkNames(rel);
  }
}
for (const docRoot of ['doc', 'docs', 'reports']) walkNames(docRoot);
for (const encoded of encodedDocNames) failures.push(`${encoded}: document filename still contains #U escaped Chinese characters.`);

const themeUseCase = read('src/app/usecases/theme.usecase.ts');
for (const removedAction of ['upsertOverride', 'deleteOverride', 'batchUpsertOverrides', 'batchDeleteOverrides', 'batchSetOverrideStatus']) {
  if (themeUseCase.includes(removedAction)) failures.push(`theme.usecase must not expose ${removedAction}.`);
}

if (failures.length) {
  console.error('[single-user-convergence-gate] failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[single-user-convergence-gate] ok: removed dual systems are absent.');
