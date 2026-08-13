#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const density = read('src/styles/tokens/density.css');
const semantic = read('src/styles/tokens/semantic.css');
const rhythm = read('src/styles/components/rhythm-boundary.css');
const settings = read('src/styles/features/settings.css');
const grouped = read('src/styles/components/grouped-container.css');
const taskRows = read('src/styles/components/task-row.css');
const dataGrid = read('src/styles/components/data-grid.css');
const moduleCss = read('src/styles/features/view-shell.modules.css');
const layoutCss = read('src/styles/features/layout-editor.css');
const layoutView = read('src/features/settings/tabs/LayoutSettings.tsx');
const themeCss = read('src/styles/features/settings-editors.theme-metadata.css');
const themeView = read('src/features/settings/data/ThemeMetadataManager.tsx');
const blockSettings = read('src/styles/features/settings-editors.block-editor.css');
const progress = read('src/styles/features/progress.css');
const energy = read('src/styles/features/energy-view.css');

for (const token of [
  '--think-rhythm-inline',
  '--think-rhythm-row',
  '--think-rhythm-related',
  '--think-rhythm-group',
  '--think-rhythm-section',
  '--think-rhythm-major',
  '--think-object-padding',
  '--think-object-gap',
]) {
  if (!density.includes(token)) failures.push(`rhythm token missing: ${token}`);
}

for (const token of ['--think-object-bg', '--think-object-border', '--think-structural-divider']) {
  if (!semantic.includes(token)) failures.push(`boundary token missing: ${token}`);
}

if (!rhythm.includes('.think-os .think-object-frame') || !rhythm.includes('border: 1px solid var(--think-object-border)')) {
  failures.push('Independent objects must use the shared think-object-frame boundary contract.');
}
if (!rhythm.includes('.think-row-flow') || !rhythm.includes('.think-section-flow')) {
  failures.push('Shared row/group/section rhythm utilities are missing.');
}

if (/think-settings-section \+ \.think-settings-section[\s\S]{0,160}border-top/.test(settings)) {
  failures.push('Settings sibling sections must use whitespace rhythm, not automatic divider lines.');
}
if (!settings.includes('gap: var(--think-rhythm-section)')) {
  failures.push('Settings page composition must consume the shared section rhythm.');
}
if (/\.think-disclosure\s*\{[\s\S]{0,180}border-top/.test(grouped)) {
  failures.push('Disclosure sections must not create a Card/divider boundary by default.');
}
if (!grouped.includes('.bv-group + .bv-group') || !grouped.includes('var(--think-rhythm-related)')) {
  failures.push('Block sibling groups must consume shared group rhythm.');
}
if (/\.think-list-row\s*\{[\s\S]{0,260}border-bottom/.test(taskRows)) {
  failures.push('Ordinary list rows must not rely on horizontal divider lines.');
}

if (!moduleCss.includes('margin-bottom: var(--think-object-gap)')) {
  failures.push('Dashboard modules must use independent-object spacing.');
}
if (!layoutView.includes('think-layout-list__item think-object-frame') || !layoutCss.includes('gap: var(--think-object-gap)')) {
  failures.push('Saved Layouts are independent objects and must use the shared frame + object gap.');
}
if (!themeView.includes('think-theme-metadata__entry think-object-frame think-object-frame--compact') || /think-theme-metadata__entry[\s\S]{0,120}border-bottom/.test(themeCss)) {
  failures.push('Theme management rows must use one compact object frame instead of divider-only rows.');
}
if (/think-block-manager__list[^}]*border-top|think-block-accordion[^}]*border-bottom/.test(blockSettings)) {
  failures.push('Record Type management must separate siblings with rhythm, not repeated horizontal dividers.');
}
if (!progress.includes('.think-progress-section + .think-progress-section') || !progress.includes('margin-top: var(--think-rhythm-group)')) {
  failures.push('Progress goal siblings must use shared group rhythm.');
}
if (/think-energy-view__goal \+ \.think-energy-view__goal[\s\S]{0,160}border-top/.test(energy)) {
  failures.push('Energy goal siblings must use whitespace, not horizontal dividers.');
}
if (!dataGrid.includes('--think-data-grid-frame-border: var(--think-border-frame)')) {
  failures.push('Data grids must keep one clear frame boundary stronger than internal grid lines.');
}

if (failures.length) {
  console.error('Rhythm / boundary convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rhythm / boundary convergence gate passed (row < related < group < section; independent objects framed; sibling sections use whitespace).');
