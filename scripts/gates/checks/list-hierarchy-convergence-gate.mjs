#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const grouped = read('src/shared/ui/GroupedContainer.tsx');
const blockModel = read('src/features/views/runtime/BlockViewModel.ts');
const groupedCss = read('src/styles/components/grouped-container.css');
const periodView = read('src/features/views/runtime/StatisticsView/views/PeriodStatisticsView.tsx');
const chart = read('src/features/views/runtime/components/statistics/ChartBlock.tsx');
const grids = read('src/styles/features/statistics.grids.css');

const listSystemCss = read('src/styles/components/task-row.css');
const blockView = read('src/features/views/runtime/BlockView.tsx');
const blockItem = read('src/features/views/runtime/components/items/BlockItem.tsx');
const taskRow = read('src/features/views/runtime/components/items/TaskRow.tsx');
const progressCard = read('src/features/views/runtime/ProgressGoalCard.tsx');
const energyTasks = read('src/features/views/runtime/EnergyTaskList.tsx');
const taskTimerAction = read('src/shared/ui/composites/TaskSendToTimerButton.tsx');

if (!grouped.includes('nodes.filter(node => countItemsInGroup(node) > 0)')) {
  failures.push('GroupedContainer must drop zero-item groups before rendering');
}
if (!blockModel.includes("group: 'bv-group'")) {
  failures.push('BlockView group class must stay a single base class so level classes are generated correctly');
}
if (!groupedCss.includes('.think-os .bv-group-content') || !groupedCss.includes('border-left: 1px solid')) {
  failures.push('Block hierarchy must use indentation/guide lines instead of nested surfaces');
}
if (!groupedCss.includes('.think-os .bv-group {') || !groupedCss.includes('background: transparent;')) {
  failures.push('Block groups must remain visually flat');
}
if (periodView.includes('blocks.filter((block) => hasPeriodData(block.data))')) {
  failures.push('Statistics must preserve zero-data period slots instead of collapsing the time skeleton');
}
if (periodView.includes('column.blocks.filter((block) => hasPeriodData(block.data))')) {
  failures.push('Statistics must preserve zero-data nested period slots');
}
if (!chart.includes('const chartCategories = categories;')) {
  failures.push('Statistics charts must keep stable category columns even when a count is zero');
}
if (!chart.includes('{count}')) {
  failures.push('Statistics charts must render explicit zero counts instead of blank number cells');
}
if (!grids.includes('.sv-period-level--1') || !grids.includes('border-left: 1px solid')) {
  failures.push('Statistics period hierarchy must use indentation/guide lines');
}


if (!listSystemCss.includes('--think-list-row-min-height') || !listSystemCss.includes('.think-os .think-list-row')) {
  failures.push('List-family row density and hover must be owned by the shared task/list component stylesheet');
}
if (!blockView.includes('bv-container think-list') || blockView.includes('ResizeObserver')) {
  failures.push('BlockView must use the shared list system and CSS container queries instead of JS width state');
}
if (!blockItem.includes('think-list-row think-list-row--interactive')) {
  failures.push('Block record rows must consume the shared list-row contract');
}
if (!taskRow.includes('listRow?: boolean') || !taskRow.includes("listRow ? 'think-list-row")) {
  failures.push('TaskRow must opt into list-row skin contextually so table/timeline inline usages are not restyled');
}
if (!progressCard.includes('think-list-row think-list-row--interactive') || !progressCard.includes('<ThinkIcon')) {
  failures.push('Progress goal/theme rows must share list-row density and the shared icon language');
}
if (!energyTasks.includes('SimpleSelect') || energyTasks.includes('<select') || !energyTasks.includes('think-list-row think-list-row--interactive')) {
  failures.push('Energy task list must use shared controls and list-row recommendation behavior');
}
if (!taskTimerAction.includes('ThinkIconButton') || taskTimerAction.includes('IconAction')) {
  failures.push('Task-row timer action must use the native Think icon-button primitive instead of the legacy MUI wrapper');
}

if (failures.length) {
  console.error('List hierarchy convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('List hierarchy convergence gate passed (shared list-row system; flat Block hierarchy; Statistics time skeleton preserved).');
