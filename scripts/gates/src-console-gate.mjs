#!/usr/bin/env node
// Guard production source paths from reintroducing ad-hoc console.* calls.
// Central diagnostic utilities are allowed; feature/UI/platform files should
// route diagnostics through @shared/public diagnostic helpers or core devLogger.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const root = process.cwd();
const srcDir = join(root, 'src');

const allowed = new Set([
  'src/core/utils/devLogger.ts',
  'src/core/recordInput/debug.ts',
  'src/shared/utils/diagnosticConsole.ts',
]);

const consoleCallRe = /(^|[^\w"'`])console\.(log|warn|error|info|trace|groupCollapsed|groupEnd|time|timeEnd)\s*\(/;
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walk(abs);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(abs);
  }
}

walk(srcDir);

const violations = [];
for (const abs of files) {
  const rel = relative(root, abs).replace(/\\/g, '/');
  if (allowed.has(rel)) continue;
  const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (consoleCallRe.test(line)) {
      violations.push({ file: rel, line: i + 1, text: line.trim() });
    }
  }
}

if (violations.length) {
  console.error('❌ [src-console-gate] Raw console.* calls are not allowed outside diagnostic utilities.');
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} ${v.text}`);
  }
  console.error('\nFix: use diagnosticLog/diagnosticWarn/diagnosticError from @shared/public, or core devLogger/recordDebug for core-only code.');
  process.exit(1);
}

console.log('✅ [src-console-gate] OK: src console output is centralized.');
