#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

expectContains('src/core/types/cache.ts', 'CURRENT_CACHE_SCHEMA_VERSION = 12', 'scanner integrity diagnostics changed cache shape');
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
