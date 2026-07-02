#!/usr/bin/env node
// Targeted guard for settings view barrel exports.
// Runtime business views no longer belong to shared/ui. They are owned by the
// settings feature and exported through @features/settings/views/public.

import { readFileSync } from 'fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function fail(message) {
  console.error(`[settings-view-export-gate] ${message}`);
  process.exit(1);
}

const sharedPublic = read('src/shared/public.ts');
const sharedUiPublic = read('src/shared/ui/public.ts');
const featurePublic = read('src/features/settings/views/public.ts');
const runtimeIndex = read('src/features/settings/views/runtime/index.ts');
const statisticsIndex = read('src/features/settings/views/runtime/StatisticsView/index.ts');
const statisticsBridge = read('src/features/settings/layout/statisticsPopoverBridge.tsx');
const layoutRenderer = read('src/features/settings/layout/LayoutRenderer.tsx');

for (const source of [sharedPublic, sharedUiPublic]) {
  if (source.includes('./ui/views') || source.includes('./views')) {
    fail('shared public facades must not export business runtime views. Use @features/settings/views/public.');
  }
}

for (const required of [
  "export * from './runtime';",
  "export * from './runtime/ViewToolbar';",
  "export * from './runtime/timeline-parser';",
  "export * from './models/viewModelRegistry';",
]) {
  if (!featurePublic.includes(required)) fail(`src/features/settings/views/public.ts must include: ${required}`);
}

if (statisticsBridge.includes('PopoverContent') && !runtimeIndex.includes('PopoverContent')) {
  fail('src/features/settings/views/runtime/index.ts must re-export PopoverContent when statisticsPopoverBridge imports it from the settings views public facade.');
}

if (!statisticsBridge.includes("from '@features/settings/views/public'")) {
  fail('statisticsPopoverBridge must import PopoverContent from @features/settings/views/public.');
}

if (!layoutRenderer.includes("from '@features/settings/views/public'")) {
  fail('LayoutRenderer must import ViewToolbar from @features/settings/views/public.');
}

if (!statisticsIndex.includes('PopoverContent')) {
  fail('src/features/settings/views/runtime/StatisticsView/index.ts must export PopoverContent from components/PopoverContent.');
}

console.log('✅ [settings-view-export-gate] OK: settings runtime views are exported by feature facade, not shared.');
