#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const registry = read('src/features/views/registry.ts');
const recordGesture = read('src/shared/ui/utils/recordOrigin.ts');
const grouped = read('src/shared/ui/GroupedContainer.tsx');
const itemLink = read('src/features/views/runtime/components/items/ItemLink.tsx');
const taskRow = read('src/features/views/runtime/components/items/TaskRow.tsx');
const timelineBody = read('src/features/views/runtime/components/timeline/DayColumnBody.tsx');
const heatmapCell = read('src/features/views/runtime/components/heatmap/HeatmapCell.tsx');
const statsChart = read('src/features/views/runtime/components/statistics/ChartBlock.tsx');
const energyTasks = read('src/features/views/runtime/EnergyTaskList.tsx');
const energyTimelineMap = read('src/features/views/runtime/EnergyTimelineMap.tsx');
const energyCalendarMap = read('src/features/views/runtime/EnergyCalendarMap.tsx');
const energyDetail = read('src/features/views/runtime/EnergySampleDetail.tsx');
const fieldPill = read('src/features/views/runtime/components/items/FieldPill.tsx');
const excelCell = read('src/features/views/runtime/excel-view/ExcelCell.tsx');
const modulePanel = read('src/app/dashboard/ModulePanel.tsx');

for (const view of [
  'TableView', 'BlockView', 'TimelineView', 'EventTimelineView', 'ExcelView',
  'StatisticsView', 'HeatmapView', 'ProgressView', 'EnergyView',
]) {
  if (!registry.includes(`${view},`)) failures.push(`VIEW_REGISTRY must include ${view}`);
}

if (!recordGesture.includes('pendingPrimary') || !recordGesture.includes('cancelPendingPrimary')) {
  failures.push('Record gesture must cancel pending primary activation before double-click/origin actions');
}
if (!recordGesture.includes('hasPlatformModifier') || !recordGesture.includes('onKeyDown')) {
  failures.push('Record gesture must own platform modifier and keyboard semantics');
}
if (!recordGesture.includes('RECORD_GESTURE_HINT')) {
  failures.push('Record gesture hint must be centralized');
}

for (const [name, source] of [
  ['ItemLink', itemLink],
  ['TaskRow', taskRow],
  ['Timeline task block', timelineBody],
]) {
  if (!source.includes('createRecordGestureHandlers')) failures.push(`${name} must use shared Record gestures`);
  if (!source.includes('onKeyDown')) failures.push(`${name} must expose keyboard activation`);
}

if (!grouped.includes('hasPlatformModifier(evt)') || !grouped.includes('Ctrl/⌘+点击')) {
  failures.push('GroupedContainer must use the same Ctrl/⌘ structural toggle modifier on Windows/macOS');
}
if (!grouped.includes('onKeyDown')) failures.push('GroupedContainer titles must be keyboard-toggleable');

if (!heatmapCell.includes('role="button"') || !heatmapCell.includes('onKeyDown')) {
  failures.push('Heatmap cells must expose the same activation semantics to mouse and keyboard');
}
if (!heatmapCell.includes('items?.length === 1') || !heatmapCell.includes('onOpenRecordOrigin') || !heatmapCell.includes('hasPlatformModifier')) {
  failures.push('Heatmap cells must allow Ctrl/⌘ origin jump when the cell identifies exactly one Record');
}

if (!statsChart.includes('openCategory') || !statsChart.includes('sv-chart-number') || !statsChart.includes('onKeyDown')) {
  failures.push('Statistics category number/bar/label clicks must resolve to the same category action');
}
if (!statsChart.includes('blocks.length === 1') || !statsChart.includes('onOpenRecordOrigin') || !statsChart.includes('hasPlatformModifier')) {
  failures.push('Statistics must allow Ctrl/⌘ origin jump when a visual bucket identifies exactly one Record');
}
if (!energyTasks.includes('Ctrl/⌘+点击打开原文') || !energyTasks.includes('onOpenRecordOrigin(task.item)')) {
  failures.push('Energy task chips must keep primary=start and modifier=origin semantics explicit');
}
if (!energyTimelineMap.includes('onOpenRecordOrigin(sample.item)') || !energyTimelineMap.includes('hasPlatformModifier')) {
  failures.push('Energy sample dots must support Ctrl/⌘ origin jump');
}
if (!energyCalendarMap.includes('day.samples.length === 1') || !energyCalendarMap.includes('onOpenRecordOrigin')) {
  failures.push('Energy aggregate day dots must expose origin jump when exactly one sample backs the dot');
}
if (!energyDetail.includes('createRecordGestureHandlers') || !energyDetail.includes('think-energy-detail__record-row')) {
  failures.push('Energy detail record rows/actions must use shared Record gestures');
}
if (!fieldPill.includes('onOpenRecordOrigin') || !fieldPill.includes('hasPlatformModifier')) {
  failures.push('Visible record field pills must support modifier-origin navigation');
}
if (!excelCell.includes('hasPlatformModifier(event)') || !excelCell.includes('onOpenRecordOrigin?.(item)')) {
  failures.push('Excel Ctrl/⌘+click must open the backing Record origin while ordinary click remains spreadsheet selection');
}
if (!modulePanel.includes('role="button"') || !modulePanel.includes('onKeyDown')) {
  failures.push('Module headers must support keyboard collapse/expand through the shared activation contract');
}

if (failures.length) {
  console.error('[view-interaction-convergence] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[view-interaction-convergence] PASS (9 views; every uniquely record-backed click surface supports Ctrl/⌘ origin navigation)');
