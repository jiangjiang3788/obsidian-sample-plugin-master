#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const exists = (file) => fs.existsSync(file);
const read = (file) => exists(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!exists(file)) failures.push(`${file} must exist`); };
const forbidFile = (file) => { if (exists(file)) failures.push(`${file} must not exist after R7`); };
const requireText = (file, text) => { if (!read(file).includes(text)) failures.push(`${file} must include ${JSON.stringify(text)}`); };
const forbidText = (file, text) => { if (read(file).includes(text)) failures.push(`${file} must not include ${JSON.stringify(text)}`); };

// Settings is configuration/editing only. Runtime business views live in features/views.
forbidFile('src/features/settings/views/runtime');
forbidFile('src/features/settings/views/models');
requireFile('src/features/settings/views/editors');
requireFile('src/features/settings/views/public.ts');
forbidText('src/features/settings/views/public.ts', './runtime');
forbidText('src/features/settings/views/public.ts', 'viewModelRegistry');
requireText('src/features/settings/views/public.ts', './editors/registry');

// View runtime has an explicit feature boundary and owns the runtime registry.
requireFile('src/features/views/runtime');
requireFile('src/features/views/registry.ts');
requireFile('src/features/views/public.ts');
requireText('src/features/views/public.ts', "export * from './runtime';");
requireText('src/features/views/public.ts', "export * from './registry';");

// Dashboard composition belongs to app: it may combine settings configuration with runtime views.
for (const file of [
  'src/app/dashboard/ViewContent.tsx',
  'src/app/dashboard/RendererService.ts',
  'src/app/dashboard/CodeblockEmbedder.ts',
  'src/app/dashboard/useViewData.ts',
  'src/app/dashboard/useLayoutModuleActions.ts',
  'src/app/dashboard/registerDashboard.ts',
]) requireFile(file);
requireText('src/app/dashboard/registerDashboard.ts', "id: 'dashboard'");
forbidText('src/features/settings/registerFeature.ts', "id: 'dashboard'");
forbidText('src/features/settings/registerFeature.ts', 'RendererService');
forbidText('src/features/settings/registerFeature.ts', 'CodeblockEmbedder');

// R7 removes the second pre-compute layer; runtime views build render models from query/domain inputs.
for (const file of [
  'src/features/settings/views/models/viewModelRegistry.ts',
  'src/features/settings/views/models/blockViewModel.ts',
  'src/features/settings/views/models/eventTimelineViewModel.ts',
  'src/features/settings/views/models/timelineViewModel.ts',
  'src/features/settings/views/models/statisticsViewModel.ts',
  'src/features/settings/views/models/progressViewModel.ts',
  'src/features/views/runtime/StatisticsView/useStatisticsCategoryConfigs.ts',
]) forbidFile(file);

const forbiddenRuntimeInjectionMarkers = [
  'buildViewRenderModels',
  'viewModelRegistry',
  'injectedGoalHeatmapGroups',
  'injectedThemesByPath',
  'injectedThemesToTrack',
  'injectedFilteredCategories',
];
function walk(dir) {
  if (!exists(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = read(full);
      for (const marker of forbiddenRuntimeInjectionMarkers) {
        if (text.includes(marker)) failures.push(`${full} must not retain precomputed runtime injection marker ${marker}`);
      }
    }
  }
}
walk('src/features/views');
walk('src/app/dashboard');

// Settings layout retains editors/configuration only, not dashboard runtime composition.
for (const name of ['RendererService.ts', 'ViewContent.tsx', 'LayoutRenderer.tsx', 'CodeblockEmbedder.ts']) {
  forbidFile(path.join('src/features/settings/layout', name));
}

if (failures.length) {
  console.error('[settings-view-runtime-r7] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[settings-view-runtime-r7] PASS (settings edits config; views run views; app composes dashboard)');
