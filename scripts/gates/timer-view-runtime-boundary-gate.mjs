#!/usr/bin/env node
// TimerViewView should stay a presentational view. Obsidian app wiring,
// QuickInput modal creation, and record-open runtime actions belong in the
// TimerView container.

import fs from 'node:fs';

const file = 'src/features/timer/TimerViewView.tsx';
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

function fail(message) {
  console.error(`[timer-view-runtime-boundary-gate] ${message}`);
  process.exit(1);
}

if (!source) fail(`${file} not found`);

const forbidden = [
  ['app:', 'TimerViewViewProps must not expose an app prop'],
  ['QuickInputModal', 'TimerViewView must not create QuickInputModal'],
  ['openEditFromItem', 'TimerViewView must not call app record edit action'],
  ['openRecordOrigin', 'TimerViewView must not call app origin-open action'],
  ['new QuickInputModal', 'TimerViewView must not instantiate QuickInputModal'],
];

for (const [needle, reason] of forbidden) {
  if (source.includes(needle)) fail(`${reason}: found '${needle}' in ${file}`);
}

console.log('✅ [timer-view-runtime-boundary-gate] OK: TimerViewView remains presentational.');
