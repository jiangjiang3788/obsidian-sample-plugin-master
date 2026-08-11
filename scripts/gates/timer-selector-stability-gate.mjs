#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const path = 'src/app/store/selectors/timer.selectors.ts';
const source = readFileSync(path, 'utf8');

function fail(message) {
  console.error(`[timer-selector-stability-gate] ${message}`);
  process.exit(1);
}

if (/selectTimers\s*=\s*\([^)]*\)\s*=>[^;]*\.filter\s*\(/s.test(source)) {
  fail('selectTimers must not create a fresh filtered array on every Zustand snapshot read');
}
if (!source.includes('entries === lastTimerEntries')) {
  fail('selectTimers must preserve reference identity when timer entries are unchanged');
}
console.log('[timer-selector-stability-gate] ok: active timer selector is referentially stable');
