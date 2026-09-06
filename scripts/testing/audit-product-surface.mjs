#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'test/system/feature-test-map.json'), 'utf8'));
const featureById = new Map(manifest.features.map((f) => [f.id, f]));
const errors = [];

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function requireFeature(id, source) {
  const feature = featureById.get(id);
  if (!feature) { errors.push(`缺少功能条目 ${id}`); return; }
  if (source && !(feature.sources || []).includes(source)) errors.push(`${id} 未追踪源码入口：${source}`);
}
function objectKeys(text, constName) {
  const start = text.indexOf(`export const ${constName} = {`);
  if (start < 0) return [];
  const tail = text.slice(start);
  const end = tail.indexOf('} satisfies');
  const body = end >= 0 ? tail.slice(0, end) : tail.slice(0, 2500);
  return [...body.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*[:,]/gm)].map((m) => m[1]);
}
function sameSet(a, b) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

const runtimeSource = 'src/features/views/registry.ts';
const editorSource = 'src/features/settings/views/editors/registry.tsx';
const runtimeViews = objectKeys(read(runtimeSource), 'VIEW_RUNTIME_BINDINGS');
const editorViews = objectKeys(read(editorSource), 'VIEW_EDITORS');
if (!sameSet(runtimeViews, editorViews)) errors.push(`视图运行时与设置编辑器注册不一致：运行时=${runtimeViews.join('、')}；编辑器=${editorViews.join('、')}`);
const viewFeatureMap = {
  BlockView: 'F080', TableView: 'F081', ExcelView: 'F082', TimelineView: 'F083',
  EventTimelineView: 'F084', StatisticsView: 'F085', HeatmapView: 'F086', ProgressView: 'F087', EnergyView: 'F088',
  EisenhowerView: 'F093',
};
if (runtimeViews.length !== Object.keys(viewFeatureMap).length) {
  errors.push(`用户视图注册数量与功能地图不一致：运行时 ${runtimeViews.length} 种，功能地图 ${Object.keys(viewFeatureMap).length} 种。`);
}
for (const view of runtimeViews) {
  const id = viewFeatureMap[view];
  if (!id) errors.push(`视图 ${view} 没有功能地图映射。`);
  else requireFeature(id);
}

const settingsRoot = read('src/platform/obsidian/SettingsRoot.tsx');
const primaryLabels = [...settingsRoot.matchAll(/\{ value: '\d+', label: '([^']+)' \}/g)].map((m) => m[1]);
const expectedPrimary = ['数据管理', '布局', '通用', 'AI'];
if (!sameSet(primaryLabels, expectedPrimary)) errors.push(`设置一级导航与测试地图基线不一致：${primaryLabels.join('、')}`);
requireFeature('F114', 'src/features/settings/tabs/DataManagementSettings.tsx');
requireFeature('F111', 'src/features/settings/tabs/LayoutSettings.tsx');
requireFeature('F110', 'src/features/settings/tabs/GeneralSettings.tsx');
requireFeature('F112', 'src/features/settings/tabs/AiSettings.tsx');

const dataSettings = read('src/features/settings/tabs/DataManagementSettings.tsx');
for (const [value, label, id, source] of [
  ['recordTypes', '记录类型', 'F115', 'src/features/settings/input/BlockManager.tsx'],
  ['goals', '目标', 'F033', 'src/features/settings/input/GoalManager.tsx'],
  ['metrics', '指标', 'F034', 'src/features/settings/input/goalManager/GoalMetricSection.tsx'],
]) {
  if (!dataSettings.includes(`{ value: '${value}', label: '${label}' }`)) errors.push(`数据管理缺少分区：${label}`);
  requireFeature(id, source);
}

const featureRegistration = read('src/app/features/registerFeatureContributions.ts');
for (const [call, ids] of [
  ['registerDashboardFeature(', ['F003']],
  ['registerSettingsFeatures(', ['F002', 'F110']],
  ['registerQuickInputFeature(', ['F040', 'F043']],
  ['registerAiInputFeature(', ['F074', 'F075']],
]) {
  if (!featureRegistration.includes(call)) errors.push(`功能注册表缺少：${call.replace('(', '')}`);
  for (const id of ids) requireFeature(id);
}

const aiCommands = read('src/features/aiinput/registerCommands.ts');
for (const id of ['think-ai-natural-input', 'think-ai-natural-input-fast', 'think-ai-speed-test']) {
  if (!aiCommands.includes(`id: '${id}'`)) errors.push(`AI 命令未注册：${id}`);
}
requireFeature('F074', 'src/features/aiinput/registerCommands.ts');
requireFeature('F075', 'src/features/aiinput/registerCommands.ts');

const quickCommands = read('src/features/quickinput/registerCommands.ts');
if (!quickCommands.includes('getEffectiveRecordTypes()')) errors.push('Quick Input 命令没有从统一 RecordType 注册表生成。');
if (!quickCommands.includes('think-quick-input-unified-${recordType.id}')) errors.push('Quick Input 动态命令 ID 规则发生变化，测试地图需复核。');
requireFeature('F010', 'src/core/recordTypes/registry.ts');
requireFeature('F041');
requireFeature('F043');

const timerCommands = read('src/app/bootstrap/loadTimerServices.ts');
if (!timerCommands.includes("id: 'toggle-think-floating-timer'")) errors.push('计时器浮窗命令未注册。');
requireFeature('F056');

console.log('\n【产品功能面审计】');
console.log(`- 运行时视图：${runtimeViews.length} 种`);
console.log(`- 设置视图编辑器：${editorViews.length} 种`);
console.log(`- 设置一级导航：${primaryLabels.join('、')}`);
console.log('- 数据管理分区：记录类型、目标、指标');
console.log('- AI 命令：自然语言、快速模式、接口测速');
console.log('- Quick Input：由统一 RecordType 注册表动态生成命令');
if (errors.length) {
  console.error(`- 结果：失败，共 ${errors.length} 个问题`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log('- 结果：通过');
