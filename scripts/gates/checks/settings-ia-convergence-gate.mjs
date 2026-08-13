#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const root = read('src/platform/obsidian/SettingsRoot.tsx');
const nav = read('src/features/settings/components/SettingsNavigation.tsx');
const shell = read('src/styles/components/settings-shell.css');
const data = read('src/features/settings/tabs/DataManagementSettings.tsx');
const blockManager = read('src/features/settings/input/BlockManager.tsx');
const goalManager = read('src/features/settings/input/GoalManager.tsx');
const goalMatrix = read('src/features/settings/goalTemplates/GoalTemplateMatrix.tsx');
const themeManager = read('src/features/settings/data/ThemeMetadataManager.tsx');
const metrics = read('src/features/settings/input/goalManager/GoalMetricSection.tsx');

if (!root.includes('think-settings-workspace__rail') || !root.includes('SettingsNavigation')) {
  failures.push('Settings root must use the shared SettingsNavigation primary rail.');
}
if (/\bTabs\b|\bTab\b/.test(root) || root.includes('muiCompat')) {
  failures.push('Settings root navigation must not fall back to MUI Tabs/Tab.');
}
if (!shell.includes('grid-template-columns: 148px minmax(0, 1fr)') || !shell.includes('.think-settings-navigation--primary')) {
  failures.push('Desktop Settings IA must keep a left primary-navigation rail.');
}
if (!shell.includes('@container think-settings (max-width: 720px)')) {
  failures.push('Settings IA must adapt by Settings container width, not viewport-only media queries.');
}
if (!nav.includes("variant?: 'primary' | 'secondary'")) {
  failures.push('SettingsNavigation must own both primary and secondary navigation roles.');
}
if (!data.includes('variant="secondary"') || data.includes('ThinkSegmentedControl')) {
  failures.push('Data Management categories must use secondary navigation, not a segmented form control.');
}
if (!data.includes("section === 'recordTypes' && <BlockManager />")) {
  failures.push('Record Type management must enter one management list instead of stacking a separate Energy section above it.');
}
if (!blockManager.includes('EnergyRecordTypeSettings') || !blockManager.includes('think-block-accordion--builtin')) {
  failures.push('Energy defaults must participate in the Record Type management language.');
}
if (goalManager.includes('cleanupGoalSettings') || goalManager.includes('整理预设')) {
  failures.push('Goal management must not expose the legacy cleanup action in the daily workflow.');
}
if (goalManager.includes('记录预设') || goalManager.includes('think-goal-manager__presets-header')) {
  failures.push('Goal management must not repeat a competing preset heading above the matrix.');
}
if (goalMatrix.includes('think-goal-template-matrix__block-filter') || goalMatrix.includes('buildNextActiveBlockIds')) {
  failures.push('Goal matrix must not permanently expose a row of Record Type filter chips.');
}
if (!goalMatrix.includes('think-management-toolbar')) {
  failures.push('Goal matrix search/collapse controls must use the management-toolbar pattern.');
}
if (themeManager.includes('>主题管理<') || themeManager.includes('>主题列表<')) {
  failures.push('Theme page must not repeat the active secondary navigation as nested management titles.');
}
if (metrics.includes('>目标指标<')) {
  failures.push('Metrics page must not repeat the active secondary navigation as a page heading.');
}

if (failures.length) {
  console.error('Settings IA convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Settings IA convergence gate passed (left primary nav; content secondary nav; list/matrix management patterns; no repeated page headings).');
