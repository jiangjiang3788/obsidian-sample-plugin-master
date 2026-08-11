import fs from 'node:fs';

const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const forbid = (file, patterns) => {
  const text = read(file);
  for (const pattern of patterns) if (pattern.test(text)) failures.push(`${file} matched forbidden ${pattern}`);
};
const requireText = (file, text) => {
  if (!read(file).includes(text)) failures.push(`${file} must include ${text}`);
};

if (fs.existsSync('src/core/records/task/mark.ts')) failures.push('legacy string Task mark.ts must be deleted');
forbid('src/core/records/task/taskStatus.ts', [/categoryKey/, /rawSource/, /item\.type/, /-\s*\[\s*[xX -]?\s*\]/]);
forbid('src/core/records/task/taskRecurrence.ts', [/\.rawSource/, /\.fullData/, /parseRecurrence/, /extractRecurrence/, /🔁/u]);
forbid('src/core/services/item/TaskCompletionMutation.ts', [/markTaskDone/, /generateNextRecurringTask/, /resolveTaskLine/, /parseItemId/, /rawLine/, /checkbox/i]);
forbid('src/app/usecases/recordInput.usecase.ts', [/parseItemLocator\(/]);
forbid('src/core/services/item/InlineFieldMutation.ts', [/ItemLocator/, /ItemMutationWriter/, /upsertKvTag/, /TaskLine/]);
forbid('src/core/services/item/GoalTemplateMigrationMutation.ts', [/ItemLocator/, /ItemMutationWriter/, /parseItemId/, /resolveBlockRangeForMutation/, /upsertKvTag/]);
requireText('src/core/records/task/taskRecurrence.ts', "type RecurrenceAnchor = 'scheduled' | 'start' | 'due' | 'completion'");
requireText('src/core/records/task/taskDomain.ts', "coreBlock: 'task-series'");
requireText('src/core/records/RecordIndex.ts', 'single-active-instance');
requireText('src/core/services/item/TaskCompletionMutation.ts', 'series.currentTaskId !== task.id');
requireText('src/core/services/item/TaskCompletionMutation.ts', "series.status === 'stopped'");
requireText('src/core/services/item/TaskCompletionMutation.ts', 'Series owns future-instance defaults');
requireText('src/core/types/cache.ts', 'CURRENT_CACHE_SCHEMA_VERSION = 12');

if (failures.length) {
  console.error('[task-domain-v2-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[task-domain-v2-gate] ok');
