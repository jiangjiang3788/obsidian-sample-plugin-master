#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const fields = read('src/core/fields/FieldRegistry.ts');
const layoutEditor = read('src/features/settings/components/LayoutEditorPanel.tsx');
const statsModel = read('src/features/views/runtime/StatisticsView/StatisticsViewModel.ts');
const statsPeriod = read('src/features/views/runtime/StatisticsView/views/PeriodStatisticsView.tsx');
const statsChart = read('src/features/views/runtime/components/statistics/ChartBlock.tsx');
const dayView = read('src/features/views/runtime/StatisticsView/views/DayStatisticsView.tsx');
const weekView = read('src/features/views/runtime/StatisticsView/views/WeekStatisticsView.tsx');

if (!fields.includes('compareFieldDefinitionsForPicker')) {
  failures.push('Field picker ordering must be centralized in FieldRegistry');
}
if (!fields.includes('Array.from(allFields.values()).sort(compareFieldDefinitionsForPicker)')) {
  failures.push('Available fields must use canonical category/order sorting');
}
if (layoutEditor.includes("prompt('请输入新的视图名称'")) {
  failures.push('Layout view rename must not depend on browser prompt()');
}
if (!layoutEditor.includes('title="重命名视图"') || !layoutEditor.includes('await _useCases.viewInstance.updateView')) {
  failures.push('Layout view rename must use the controlled rename dialog and await persistence');
}
if (!statsModel.includes('includeKnownGoals: true')) {
  failures.push('Statistics must keep known Goal columns even when the active period has zero records');
}
if (statsPeriod.includes('hasPeriodData') || statsPeriod.includes('blocks.filter((block)')) {
  failures.push('Statistics period layout must preserve zero-data time slots');
}
if (statsChart.includes('categories.filter') || !statsChart.includes('const chartCategories = categories;')) {
  failures.push('Statistics ChartBlock must preserve zero-count category columns');
}
if (dayView.includes('hasPeriodData') || weekView.includes('hasPeriodData')) {
  failures.push('Day/Week Statistics must render zero-state charts rather than replace them with blank placeholders');
}

if (failures.length) {
  console.error('[settings-field-view-convergence] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[settings-field-view-convergence] PASS (field groups ordered once; robust view rename; Statistics zero-state preserved)');
