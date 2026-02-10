#!/usr/bin/env node
/**
 * selectors-coverage-report.mjs
 *
 * Rough coverage report for Zustand selector adoption.
 * - Counts occurrences of store subscription patterns in src/**
 * - Flags "giant subscriptions" (state => state.settings / state => state)
 *
 * Usage:
 *   node scripts/selectors-coverage-report.mjs
 *   npm run selectors:coverage
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const exts = new Set(['.ts', '.tsx', '.mts', '.cts']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

function walk(dir, out=[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (exts.has(ext)) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

// naive comment stripper to reduce false positives
function stripComments(code) {
  // remove /* ... */ and // ...
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

const files = walk(SRC_DIR);
let total = files.length;

let useSelectorOcc = 0;
let useZustandOcc = 0;
let giantOcc = 0;

const offenders = [];
const giantOffenders = [];

const RE_USE_SELECTOR = /\buseSelector\s*\(/g;
const RE_USE_ZUSTAND = /\buseZustandAppStore\s*\(/g;
const RE_USE_APPSTORE = /\buseAppStore\s*\(/g; // just in case
const RE_GIANT_1 = /\buse(?:ZustandAppStore|AppStore)\s*\(\s*\(?\s*\w+\s*=>\s*\w+\s*\.settings\b/g;
const RE_GIANT_2 = /\buse(?:ZustandAppStore|AppStore)\s*\(\s*\(?\s*\w+\s*=>\s*\w+\s*\)?\s*\)/g; // state => state

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const code = stripComments(raw);

  const s1 = [...code.matchAll(RE_USE_SELECTOR)].length;
  const s2 = [...code.matchAll(RE_USE_ZUSTAND)].length + [...code.matchAll(RE_USE_APPSTORE)].length;

  const g1 = [...code.matchAll(RE_GIANT_1)].length;
  const g2 = [...code.matchAll(RE_GIANT_2)].length;

  if (s1) useSelectorOcc += s1;
  if (s2) useZustandOcc += s2;

  const g = g1 + g2;
  if (g) {
    giantOcc += g;
    giantOffenders.push({ file: rel(f), count: g });
  }

  if (s2) offenders.push({ file: rel(f), count: s2 });
}

offenders.sort((a,b)=>b.count-a.count);
giantOffenders.sort((a,b)=>b.count-a.count);

const totalSubs = useSelectorOcc + useZustandOcc;
const selectorShare = totalSubs ? (useSelectorOcc / totalSubs) : 1;

function pct(x){ return Math.round(x*1000)/10; }

console.log('=== selectors coverage report ===');
console.log(`Scanned files: ${total}`);
console.log(`Subscription occurrences: ${totalSubs}`);
console.log(`- useSelector(...): ${useSelectorOcc}`);
console.log(`- useZustandAppStore/useAppStore(...): ${useZustandOcc}`);
console.log(`Selector share: ${pct(selectorShare)}%`);

console.log('');
console.log('Giant subscriptions (should be 0):', giantOcc);
if (giantOffenders.length) {
  console.log('Top giant offenders:');
  for (const o of giantOffenders.slice(0, 10)) {
    console.log(`  ${o.count}  ${o.file}`);
  }
}

console.log('');
console.log('Remaining direct store subscriptions (top 15):');
for (const o of offenders.slice(0, 15)) {
  console.log(`  ${o.count}  ${o.file}`);
}

// Exit non-zero if giant subscriptions exist (useful for CI).
if (giantOcc > 0) process.exitCode = 2;
