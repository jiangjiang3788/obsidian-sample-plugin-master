#!/usr/bin/env node
/**
 * theme-matrix-legacy-import-gate
 *
 * Goal:
 * - 防止 ThemeMatrixView 回退到 legacy wrapper: buildThemeMatrixTree
 *
 * Rule:
 * - src/features/settings/ThemeMatrixView.tsx 不得 import 或引用 buildThemeMatrixTree
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const target = path.join(repoRoot, 'src/features/settings/ThemeMatrixView.tsx');

function stripComments(code) {
  // remove block comments and line comments (best-effort)
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function fail(msg) {
  console.error(`❌ [theme-matrix-legacy-import-gate] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.log('✅ [theme-matrix-legacy-import-gate] ThemeMatrixView.tsx not found (skipped)');
  process.exit(0);
}

const raw = fs.readFileSync(target, 'utf8');
const code = stripComments(raw);

const forbidden = /\bbuildThemeMatrixTree\b/;

if (forbidden.test(code)) {
  fail('ThemeMatrixView.tsx references buildThemeMatrixTree (legacy). Use ThemeTreeBuilder + flattenThemePathTree instead.');
}

console.log('✅ [theme-matrix-legacy-import-gate] No legacy buildThemeMatrixTree import/reference in ThemeMatrixView.tsx');
