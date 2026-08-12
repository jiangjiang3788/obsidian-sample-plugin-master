#!/usr/bin/env node
import fs, { existsSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { failWithViolations, printOk } from '../../lib/gate-formatter.mjs';

function check_di_resolve_gate() {
  const projectRoot = process.cwd();
  const SRC_DIR = path.join(projectRoot, "src");

  // Round3: Only allow container.resolve() in a single composition root file.
  // All other files must receive deps via parameter passing.
  const ALLOW_PREFIXES = [path.join(SRC_DIR, "app", "bootstrap", "buildRuntime.ts")];

  function isAllowed(filePath) {
    const abs = path.resolve(filePath);
    for (const p of ALLOW_PREFIXES) {
      if (p.endsWith(path.sep)) {
        if (abs.startsWith(p)) return true;
      } else {
        if (abs === p) return true;
      }
    }
    return false;
  }

  // naive comment stripper (good enough for gate)
  function stripComments(code) {
    // remove block comments
    let out = code.replace(/\/\*[\s\S]*?\*\//g, "");
    // remove line comments
    out = out.replace(/\/\/.*$/gm, "");
    return out;
  }

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...walk(full));
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(full);
    }
    return files;
  }

  const allFiles = walk(SRC_DIR);
  const violations = [];

  for (const file of allFiles) {
    if (isAllowed(file)) continue;
    const raw = fs.readFileSync(file, "utf-8");
    const code = stripComments(raw);
    const re = /\bcontainer\.resolve\s*\(/g;
    if (re.test(code)) {
      violations.push(file);
    }
  }

  if (violations.length) {
    console.error("❌ [di-resolve-gate] container.resolve() is not allowed outside composition roots.");
    for (const f of violations) console.error(" - " + path.relative(projectRoot, f));
    process.exit(1);
  }

  console.log("✅ [di-resolve-gate] OK: container.resolve() confined to composition roots");
}

check_di_resolve_gate();

function check_data_store_boundary_gate() {
  // ---------------------------------------------------------------------------
  // DataStore Boundary Gate
  // ---------------------------------------------------------------------------
  // Goal:
  // - Keep DataStore.ts as a facade/orchestrator.
  // - Prevent scanner/cache/query parsing details from creeping back into it.



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
}

check_data_store_boundary_gate();

function check_record_foundation_v2_stability_gate() {
  const root = process.cwd();
  const failures = [];
  const read = (path) => readFileSync(join(root, path), 'utf8');
  const expectFile = (path) => { if (!existsSync(join(root, path))) failures.push(`${path} missing`); };
  const expectContains = (path, needle, reason) => {
    if (!existsSync(join(root, path))) return failures.push(`${path} missing: ${reason}`);
    if (!read(path).includes(needle)) failures.push(`${path} must contain ${needle}: ${reason}`);
  };
  const expectNotContains = (path, needle, reason) => {
    if (!existsSync(join(root, path))) return failures.push(`${path} missing: ${reason}`);
    if (read(path).includes(needle)) failures.push(`${path} must not contain ${needle}: ${reason}`);
  };

  expectFile('.github/workflows/ci.yml');
  expectContains('.github/workflows/ci.yml', 'npm run verify:ci', 'CI must execute the full verification path');
  expectContains('.github/workflows/ci.yml', 'npm run build:release', 'CI must exercise release packaging');

  expectContains('src/core/types/cache.ts', 'CURRENT_CACHE_SCHEMA_VERSION = 13', 'scanner integrity diagnostics changed cache shape');
  expectContains('src/core/types/cache.ts', 'integrityIssues?', 'warm-start cache must retain scanner diagnostics');
  expectContains('src/core/services/DataStore.ts', 'cached.integrityIssues', 'warm-start must restore scanner diagnostics');
  expectContains('src/core/services/DataStore.ts', 'stageFileItems', 'bulk startup scans must stage files without rebuilding per file');
  expectContains('src/core/services/DataStore.ts', 'this.index.rebuild()', 'bulk startup scans must rebuild identity once at the end');
  expectNotContains('src/core/services/DataStore.ts', 'hydrateFileItems(path, this.cacheStore.restoreItems(cached))', 'warm-start must not rebuild the full identity index for every cached file');

  expectContains('src/core/records/RecordRepository.ts', "await this.batch([{ kind: 'create'", 'create must use the same optimistic transaction path as update/delete');
  expectContains('src/core/records/RecordRepository.ts', 'record_id_duplicate_create', 'repository must reject duplicate IDs before write');
  expectContains('src/core/records/RecordRepository.ts', 'RecordTransactionRecoveryError', 'incomplete rollback must become a data-health issue');
  expectContains('src/core/records/RecordMutationTransaction.ts', 'record_write_conflict', 'manual edits between plan/write must abort');
  expectContains('src/core/records/RecordMutationTransaction.ts', 'RecordTransactionRecoveryError', 'rollback failure must be typed and diagnosable');

  expectContains('src/platform/obsidian/events/VaultWatcher.ts', 'handleRename', 'rename must have an explicit stable-ID rescan path');
  expectContains('src/platform/obsidian/events/VaultWatcher.ts', "throwOnError: true", 'rename rescan failures must not be silently accepted');
  expectContains('src/core/records/RecordIndex.ts', 'startEnergyRecordId', 'Session energy references must participate in integrity checks');
  expectContains('src/core/services/item/TaskCompletionMutation.ts', 'repairSeriesCurrentTask', 'deterministic series-pointer repair API must exist');

  if (failures.length) {
    console.error('\n[record-foundation-v2-stability-gate] failed');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('[record-foundation-v2-stability-gate] ok: transaction, cache, rename, integrity and repair hardening present');
}

check_record_foundation_v2_stability_gate();
