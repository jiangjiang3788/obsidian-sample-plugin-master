import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const legacyFiles = [
  'src/core/records/codec/MarkdownTaskCodec.ts',
  'src/core/records/codec/MarkdownBlockCodec.ts',
  'src/core/recordInput/mutation/TaskLinePatch.ts',
  'src/core/services/item/ItemLocator.ts',
  'src/core/services/item/itemId.ts',
  'src/core/services/item/ItemMutationWriter.ts',
  'src/core/services/item/lineMetadata.ts',
  'src/core/utils/text.ts',
  'test/unit/taskLinePatch.test.ts',
];

for (const file of legacyFiles) {
  if (fs.existsSync(file)) failures.push(`${file}: legacy file must be physically deleted`);
}

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

const runtimeAndTests = ['src', 'test']
  .flatMap(walk)
  .filter((file) => /\.(ts|tsx)$/.test(file));

const forbidden = [
  { re: /(^|\n)\s*[-*+]\s*\[[ xX-]\]\s+/m, reason: 'Markdown checkbox Task grammar' },
  { re: /🔁\s*every\b/i, reason: 'emoji recurrence grammar' },
  { re: /\bparseTaskLine\b/, reason: 'Task Line parser' },
  { re: /\bMarkdownTaskCodec\b/, reason: 'Task-specific Markdown codec' },
  { re: /\bTaskLinePatch\b/, reason: 'Task Line patcher' },
  { re: /\bresolveTaskLineIndexForMutation\b/, reason: 'Task Line locator' },
  { re: /\bloadMutableTaskContext\b/, reason: 'Task Line mutation context' },
  { re: /\bparseItemLocator\b|\bparseItemId\b/, reason: 'path+line ID decoder' },
  { re: /\btaskStatusPrefix\b|\btaskDateToken\b|\brepeatToken\b/, reason: 'Task Line render token' },
  { re: /\btype\s*:\s*['"](?:task|block)['"]/, reason: 'Item.type task/block storage model' },
  { re: /\b(?:item|record|task)\.type\s*={2,3}\s*['"](?:task|block)['"]/, reason: 'Item.type task/block business check' },
  { re: /\brecurrence\s*:\s*['"](?:none|every\b)/i, reason: 'string recurrence storage/fixture' },
  { re: /\bcategoryKey\s*(?::|={2,3})\s*['"](?:未完成任务|完成任务|任务\/(?:todo|done))['"]/, reason: 'category-as-Task-status legacy semantic' },
  { re: /\.md#\d+\b/, reason: 'path#line record identity' },
  { re: /lastIndexOf\(\s*['"]#['"]\s*\)/, reason: 'record ID decoded as path#line' },
];

for (const file of runtimeAndTests) {
  const text = fs.readFileSync(file, 'utf8');
  for (const check of forbidden) {
    if (check.re.test(text)) failures.push(`${file}: ${check.reason}`);
  }
}

const schema = fs.readFileSync('src/core/types/schema.ts', 'utf8');
if (/\btype\s*:\s*['"]task['"]\s*\|\s*['"]block['"]/.test(schema)) failures.push('schema.ts: Item.type task/block must not exist');
if (/\brecurrence\??\s*:\s*string\b/.test(schema)) failures.push('schema.ts: recurrence string projection must not exist');

const cache = fs.readFileSync('src/core/types/cache.ts', 'utf8');
if (!cache.includes('CURRENT_CACHE_SCHEMA_VERSION = 12')) failures.push('cache.ts: cache schema must be v12 after integrity persistence hardening');
if (/\btype\??\s*:\s*['"]task['"]\s*\|\s*['"]block['"]/.test(cache)) failures.push('cache.ts: cached Item.type legacy projection must not exist');
if (/\brecurrence\??\s*:\s*string\b/.test(cache)) failures.push('cache.ts: cached recurrence string projection must not exist');

const scanner = fs.readFileSync('src/core/services/dataStore/DataStoreFileScanner.ts', 'utf8');
if (/parseTaskLine|MarkdownTaskCodec/.test(scanner)) failures.push('DataStoreFileScanner.ts: scanner must be Record Block only');

const recordIndex = fs.readFileSync('src/core/records/RecordIndex.ts', 'utf8');
if (/\.recurrence\s*=/.test(recordIndex)) failures.push('RecordIndex.ts: must not project recurrence prose onto Item');

const codec = fs.readFileSync('src/core/records/codec/MarkdownRecordCodec.ts', 'utf8');
if (/\['预计时长'\s*,\s*\[[^\]]*['"]duration['"]/.test(codec)) failures.push('MarkdownRecordCodec.ts: Task expected duration must not alias legacy duration');

const repository = fs.readFileSync('src/core/records/RecordRepository.ts', 'utf8');
if (/expectedDurationMinutes[^\n]+aliases:[^\n]+['"]duration['"]/.test(repository)) failures.push('RecordRepository.ts: Task expected duration must not alias legacy duration');

if (failures.length) {
  console.error('[no-task-line-runtime-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[no-task-line-runtime-gate] ok (${runtimeAndTests.length} TypeScript files scanned; legacy runtime files absent)`);
