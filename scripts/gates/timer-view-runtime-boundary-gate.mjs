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


if (source.includes('class="empty-state"') || source.includes("class='empty-state'")) {
  fail('Timer empty state must be namespaced; host themes may use .empty-state as a full overlay');
}
if (!source.includes('think-timer-empty-state')) {
  fail('TimerViewView must use the namespaced think-timer-empty-state class');
}

const timerCssFile = 'src/styles/features/timer.css';
const timerCss = fs.existsSync(timerCssFile) ? fs.readFileSync(timerCssFile, 'utf8') : '';
if (!timerCss.includes('.think-os .think-timer-empty-state')) {
  fail('timer.css must own a namespaced empty-state style');
}
const modalCssFile = 'src/styles/components/modal.css';
const modalCss = fs.existsSync(modalCssFile) ? fs.readFileSync(modalCssFile, 'utf8') : '';
if (!modalCss.includes('.think-floating-panel__header') || !modalCss.includes('z-index: 2')) {
  fail('floating panel header must stay above body content so drag/close remain reachable');
}

for (const [needle, reason] of forbidden) {
  if (source.includes(needle)) fail(`${reason}: found '${needle}' in ${file}`);
}

console.log('✅ [timer-view-runtime-boundary-gate] OK: TimerViewView remains presentational.');
