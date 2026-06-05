#!/usr/bin/env node
// ---------------------------------------------------------------------------
// DataStore Boundary Gate
// ---------------------------------------------------------------------------
// Goal:
// - Keep DataStore.ts as a facade/orchestrator.
// - Prevent scanner/cache/query parsing details from creeping back into it.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { failWithViolations, printOk } from '../lib/gate-formatter.mjs';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'src', 'core', 'services', 'DataStore.ts');
const MAX_LINES = 260;

const FORBIDDEN_PATTERNS = [
  { re: /parseTaskLine|parseBlockContent/, message: 'DATSTORE-001 scanner parser details belong in src/core/services/dataStore/DataStoreFileScanner.ts' },
  { re: /toCachedItem|fromCachedItem|CURRENT_CACHE_SCHEMA_VERSION/, message: 'DATSTORE-002 cache schema details belong in src/core/services/dataStore/DataStoreCache.ts' },
  { re: /filterByRules|sortItems/, message: 'DATSTORE-003 query/filter details belong in src/core/services/dataStore/DataStoreIndex.ts' },
  { re: /pathParentName|pathBasename|basenameNoExt/, message: 'DATSTORE-004 path helpers belong in src/core/services/dataStore/pathUtils.ts' },
];

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

function main() {
  if (!fs.existsSync(TARGET)) {
    printOk('data-store-boundary-gate', 'DataStore.ts not found; skipped');
    return;
  }

  const text = fs.readFileSync(TARGET, 'utf8');
  const lines = text.split(/\r?\n/);
  const violations = [];

  if (lines.length > MAX_LINES) {
    violations.push({
      file: TARGET,
      loc: '1:1',
      message: `DATSTORE-000 DataStore.ts should stay <= ${MAX_LINES} lines, got ${lines.length}`,
      hint: 'Move scanner/cache/query/planning details under src/core/services/dataStore/* instead of growing the facade.',
    });
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    lines.forEach((line, idx) => {
      if (rule.re.test(line)) {
        violations.push({
          file: TARGET,
          loc: `${idx + 1}:1`,
          message: rule.message,
          hint: 'DataStore.ts should orchestrate collaborators only; keep implementation detail in the dedicated helper module.',
        });
      }
    });
  }

  if (violations.length) {
    failWithViolations('data-store-boundary-gate', violations, {
      rootDir: ROOT,
      summary: 'DataStore facade boundary regressed',
    });
  }

  printOk('data-store-boundary-gate', `${rel(TARGET)} remains a thin facade (${lines.length} lines)`);
}

main();
