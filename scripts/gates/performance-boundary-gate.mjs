#!/usr/bin/env node
// Keep shared performance monitoring focused on the small API surface actually
// used by the plugin bootstrap path. This prevents the utility from becoming a
// background reporter / catch-all diagnostics subsystem again.

import { readFileSync } from 'fs';

function fail(message) {
  console.error(`[performance-boundary-gate] ${message}`);
  process.exit(1);
}

const file = 'src/shared/utils/performance.ts';
const source = readFileSync(file, 'utf8');
const lines = source.split(/\r?\n/).length;

if (lines > 260) {
  fail(`${file} is ${lines} lines; keep it <= 260 lines.`);
}

const forbidden = [
  ['reportTimer', 'auto-report timers are not part of the MVP performance utility'],
  ['setInterval(', 'performance monitoring must not create background timers'],
  ['errorHandler', 'performance monitoring should not depend on global error handling'],
  ['console.', 'performance diagnostics must use devLogger helpers, not console'],
  ['performance.mark', 'performance marks are unnecessary for the lightweight bootstrap timer'],
  ['performance.measure', 'performance measures are unnecessary for the lightweight bootstrap timer'],
  ['PropertyDescriptor', 'decorator compatibility has been removed; use explicit startMeasure'],
  ['export function Measure', 'decorator compatibility has been removed; use explicit startMeasure'],
];

for (const [needle, reason] of forbidden) {
  if (source.includes(needle)) {
    fail(`${file} contains "${needle}"; ${reason}.`);
  }
}

for (const symbol of ['performanceMonitor', 'startMeasure', 'measureAsync', 'measure']) {
  const pattern = new RegExp(`export\\s+(const|async\\s+function|function)\\s+${symbol}\\b`);
  if (!pattern.test(source)) {
    fail(`${file} must keep exported ${symbol}.`);
  }
}

console.log('✅ [performance-boundary-gate] OK: performance utility stays focused.');
