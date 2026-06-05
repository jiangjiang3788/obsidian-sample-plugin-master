#!/usr/bin/env node
// The tiny legacy files under shared/ui/views/*View.tsx may remain for backwards
// compatible deep imports, but the public barrel must bypass them and export
// directly from the real folder index modules.

import { readFileSync } from 'fs';

function fail(message) {
  console.error(`[shared-view-legacy-forwarder-gate] ${message}`);
  process.exit(1);
}

const file = 'src/shared/ui/views/index.ts';
const source = readFileSync(file, 'utf8');

const required = [
  "export { TimelineView } from './TimelineView/index';",
  "export { EventTimelineView } from './EventTimelineView/index';",
  "export { StatisticsView, PopoverContent } from './StatisticsView/index';",
];

for (const line of required) {
  if (!source.includes(line)) fail(`${file} must contain: ${line}`);
}

const forbidden = [
  "export { TimelineView } from './TimelineView';",
  "export { EventTimelineView } from './EventTimelineView';",
  "export { StatisticsView, PopoverContent } from './StatisticsView';",
];

for (const line of forbidden) {
  if (source.includes(line)) fail(`${file} should bypass legacy forwarder: ${line}`);
}

console.log('✅ [shared-view-legacy-forwarder-gate] OK: shared view public barrel bypasses legacy forwarders.');
