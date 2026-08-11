#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtime = path.join(root, 'src/features/settings/views/runtime');
const dotPath = path.join(runtime, 'EnergyDot.tsx');
const encodingPath = path.join(runtime, 'EnergyVisualEncoding.ts');
const periodPath = path.join(runtime, 'EnergyPeriodMap.tsx');
const cssPath = path.join(root, 'src/styles/features/energy-map.css');

const failures = [];
for (const file of [dotPath, encodingPath, periodPath, cssPath]) {
  if (!fs.existsSync(file)) failures.push(`missing ${path.relative(root, file)}`);
}

if (failures.length === 0) {
  const dot = fs.readFileSync(dotPath, 'utf8');
  const encoding = fs.readFileSync(encodingPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  if (!dot.includes('<svg')) failures.push('EnergyDot must use an SVG root');
  if (dot.includes('<button')) failures.push('EnergyDot must not use native button chrome');
  if (dot.includes('think-energy-dot__glyph')) failures.push('legacy span glyph must not return');
  if (!dot.includes('<circle class="think-energy-dot__shape"')) failures.push('EnergyDot shape circle missing');
  if (!encoding.includes('TIMELINE_SIZES') || !encoding.includes('CALENDAR_SIZES')) failures.push('central size encoding missing');
  if (!css.includes('.think-energy-dot.is-realtime .think-energy-dot__shape')) failures.push('realtime fill rule missing');
  if (!css.includes('.think-energy-dot.is-retrospective .think-energy-dot__shape')) failures.push('retrospective hollow rule missing');
  if (/\.think-energy-dot[^\{]*\{[^}]*background\s*:/s.test(css)) failures.push('EnergyDot root must not depend on background chrome');
}

if (failures.length > 0) {
  console.error('[energy-visual-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[energy-visual-gate] OK: SVG primitive + centralized score/capture encoding enforced.');
