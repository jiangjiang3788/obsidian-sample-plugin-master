#!/usr/bin/env node
// Targeted guard for shared view barrel exports.
// This prevents Rollup-only failures where a feature imports a shared view helper
// through @shared/public but an intermediate barrel forgets to re-export it.

import { readFileSync } from 'fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function fail(message) {
  console.error(`[shared-view-export-gate] ${message}`);
  process.exit(1);
}

const sharedPublic = read('src/shared/public.ts');
const viewsIndex = read('src/shared/ui/views/index.ts');
const statisticsForwarder = read('src/shared/ui/views/StatisticsView.tsx');
const statisticsIndex = read('src/shared/ui/views/StatisticsView/index.ts');
const statisticsBridge = read('src/features/settings/layout/statisticsPopoverBridge.tsx');

if (!sharedPublic.includes("export * from './ui/views';")) {
  fail('src/shared/public.ts must export ./ui/views so @shared/public exposes view components.');
}

if (statisticsBridge.includes('PopoverContent') && !viewsIndex.includes('PopoverContent')) {
  fail('src/shared/ui/views/index.ts must re-export PopoverContent when statisticsPopoverBridge imports it from @shared/public.');
}

if (!statisticsForwarder.includes('PopoverContent')) {
  fail('src/shared/ui/views/StatisticsView.tsx must forward PopoverContent.');
}

if (!statisticsIndex.includes('PopoverContent')) {
  fail('src/shared/ui/views/StatisticsView/index.ts must export PopoverContent from components/PopoverContent.');
}

console.log('✅ [shared-view-export-gate] OK: shared view barrel exports are complete.');
