import fs from 'node:fs';

const checks = [
  {
    file: 'src/core/services/dataStore/DataStoreFileScanner.ts',
    forbidden: [/parseTaskLine/, /MarkdownTaskCodec/, /from\s+['"]@\/core\/records['"]/],
    message: 'DataStore scanner must be Record Block only and must not import the records barrel (prevents DataStore <-> RecordRepository TDZ cycles).',
  },
  {
    file: 'src/core/records/RecordRepository.ts',
    forbidden: [/@inject\(DataStore\)/, /@singleton\(\)/, /^import\s+\{\s*DataStore\s*\}\s+from\s+['"]@\/core\/services\/DataStore['"]/m],
    message: 'RecordRepository is manually composed by ItemService; DataStore must remain a type-only dependency so module evaluation cannot create a DI TDZ cycle.',
  },
  {
    file: 'src/core/recordInput/snapshot/OutputPlanner.ts',
    forbidden: [/buildTaskRenderTokens/, /taskStatusPrefix/, /taskDateToken/, /repeatToken/, /-\s*\[\s*\]/, /-\s*\[x\]/i],
    message: 'OutputPlanner must not emit Task Line grammar.',
  },
  {
    file: 'src/core/blocks/defaultCoreBlocks.ts',
    forbidden: [/-\s*\[\s*\]/, /-\s*\[x\]/i, /taskStatusPrefix/, /taskDateToken/, /repeatToken/],
    message: 'core.task must use canonical Record v2 fields.',
  },
  {
    file: 'src/core/services/InputService.ts',
    forbidden: [/resolveTaskLineIndexForMutation/, /mergeTaskLinePreservingSourceContext/, /lastIndexOf\(['"]#['"]\)/],
    message: 'Record mutation must resolve by stable recordId.',
  },
  {
    file: 'src/core/utils/parser.ts',
    forbidden: [/parseTaskLine/, /RE_TASK_PREFIX/, /decodeTaskMetadata/, /lastIndexOf\(['\"]#['\"]\)/],
    message: 'Runtime parser must not contain Task Line or path#line identity fallback.',
  },
];

const failures = [];
for (const check of checks) {
  const text = fs.readFileSync(check.file, 'utf8');
  for (const pattern of check.forbidden) {
    if (pattern.test(text)) failures.push(`${check.file}: ${check.message} matched ${pattern}`);
  }
}

if (failures.length) {
  console.error('[task-foundation-v2-gate] failed');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[task-foundation-v2-gate] ok');
