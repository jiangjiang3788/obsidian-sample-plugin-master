#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const semantic = read('src/styles/tokens/semantic.css');
const typography = read('src/styles/foundations/typography.css');
const moduleCss = read('src/styles/features/view-shell.modules.css');
const toolbarCss = read('src/styles/features/view-shell.toolbar.css');
const gridCss = read('src/styles/components/data-grid.css');
const settingsCss = read('src/styles/features/settings.css');
const progressCss = read('src/styles/features/progress.css');
const energyTaskCss = read('src/styles/features/energy-task-list.css');
const dataSettings = read('src/features/settings/tabs/DataManagementSettings.tsx');
const layoutSettings = read('src/features/settings/tabs/LayoutSettings.tsx');
const aiSettings = read('src/features/settings/tabs/AiSettings.tsx');

const buttonCss = read('src/styles/primitives/button.css');
const iconButtonCss = read('src/styles/primitives/icon-button.css');
const chipCss = read('src/styles/primitives/chip.css');
const cardCss = read('src/styles/primitives/card.css');

for (const token of [
  '--think-type-page-size',
  '--think-type-view-title-size',
  '--think-type-section-size',
  '--think-type-body-size',
  '--think-type-table-header-size',
  '--think-border-frame',
  '--think-border-selection',
  '--think-border-control',
  '--think-border-divider',
  '--think-surface-selection',
]) {
  if (!semantic.includes(token)) failures.push(`semantic hierarchy token missing: ${token}`);
}

if (!typography.includes('.think-type-view-title') || !typography.includes('.think-type-table-header')) {
  failures.push('Typography foundation must expose semantic view-title and table-header roles.');
}
if (!moduleCss.includes('var(--think-type-view-title-size)') || !semantic.includes('--think-panel-border: var(--think-border-frame)')) {
  failures.push('Module frame/title must consume the shared frame and view-title hierarchy roles.');
}
if (!toolbarCss.includes('font-size: var(--think-type-view-title-size)')) {
  failures.push('Dashboard toolbar text must share the view-title typography level.');
}
if (!gridCss.includes('var(--think-type-table-header-size)') || !gridCss.includes('var(--think-type-table-header-weight)')) {
  failures.push('Data-grid header must use the table-header typography role.');
}
if (!gridCss.includes('box-shadow: inset 0 0 0 1px var(--think-border-selection)')) {
  failures.push('Data-grid selection must use the medium selection boundary, not a heavy accent ring.');
}
if (![buttonCss, iconButtonCss, chipCss, cardCss].every((source) => source.includes('var(--think-surface-selection)'))) {
  failures.push('Selectable shared primitives must use the shared medium-weight selection surface.');
}
if (![buttonCss, iconButtonCss, chipCss, cardCss].every((source) => source.includes('var(--think-border-selection)'))) {
  failures.push('Selectable shared primitives must use the shared selection boundary instead of full accent borders.');
}
if (!settingsCss.includes('var(--think-type-page-size)') || !settingsCss.includes('var(--think-type-section-size)')) {
  failures.push('Settings page/section headings must consume shared typography roles.');
}
if (dataSettings.includes('think-settings-page__title">数据管理')) {
  failures.push('Data Management must not repeat the active top-level tab as an inner page title.');
}
if (layoutSettings.includes('think-settings-page__title">管理布局')) {
  failures.push('Layout settings must not add a competing page title under the active top-level tab.');
}
if (aiSettings.includes('think-settings-page__title">AI')) {
  failures.push('AI settings must not add a competing page title under the active top-level tab.');
}
if (progressCss.includes('calc(var(--think-font-size-lg) + 1px)')) {
  failures.push('Progress hierarchy must not self-promote with a private oversized title scale.');
}
if (energyTaskCss.includes('font-size: var(--think-font-size-xl)')) {
  failures.push('Energy task/list headings must not self-promote to an XL feature-local title.');
}

if (failures.length) {
  console.error('Visual hierarchy convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Visual hierarchy convergence gate passed (semantic type roles; frame > selection > control > divider weight order).');
