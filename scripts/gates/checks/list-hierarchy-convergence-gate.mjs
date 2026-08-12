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

if (failures.length) {
  console.error('List hierarchy convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('List hierarchy convergence gate passed (flat Block hierarchy; Statistics zero-data time skeleton preserved).');
