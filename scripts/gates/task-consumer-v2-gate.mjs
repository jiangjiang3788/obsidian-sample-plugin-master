import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const requireText = (file, text) => {
  if (!read(file).includes(text)) failures.push(`${file} must include ${JSON.stringify(text)}`);
};
const forbid = (file, patterns) => {
  const text = read(file);
  for (const pattern of patterns) if (pattern.test(text)) failures.push(`${file} matched forbidden ${pattern}`);
};

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

const consumerRoots = [
  'src/core/energy',
  'src/core/goal',
  'src/core/ai',
  'src/core/fields',
  'src/features/settings/views',
  'src/features/settings/layout',
  'src/core/services/ActionService.ts',
  'src/core/utils/itemFilter.ts',
  'src/core/utils/exportUtils.ts',
  'src/app/actions/recordEditActions.ts',
].flatMap(walk).filter((file) => /\.(ts|tsx)$/.test(file));

for (const file of consumerRoots) {
  forbid(file, [
    /\b(?:item|record|task)\.type\b/,
    /\.type\s*===?\s*['"]task['"]/,
    /['"]taskStatus['"]/,
    /['"]repeatToken['"]/,
    /categoryKey\s*===?\s*['"](?:未完成任务|完成任务)['"]/,
    /rawSource[^\n]*(?:recurr|status|checkbox|task)/i,
  ]);
}

requireText('src/core/services/dataStore/DataStoreIndex.ts', 'queryRecords(');
requireText('src/core/services/DataStore.ts', 'queryRecords(');
requireText('src/core/energy/recommendationLearning.ts', 'asTaskSessionRecord');
requireText('src/core/energy/recommendationLearning.ts', 'bySeriesId');
forbid('src/core/energy/recommendationLearning.ts', [/TimerState/, /feedback-recorded/, /energyFeedback/]);
requireText('src/features/settings/views/runtime/timeline-parser.ts', 'asTaskSessionRecord');
requireText('src/features/settings/views/runtime/timeline-parser.ts', 'sessionRecordId: session.id');
forbid('src/features/settings/views/runtime/timeline-parser.ts', [/categoryKey\s*===/, /rawSource/, /item\.type/]);
requireText('src/core/services/item/TaskSessionMutation.ts', 'linkEnergySnapshot');
requireText('src/core/services/item/TaskSessionMutation.ts', 'updateSessionTime');
requireText('src/core/fields/FieldRegistry.ts', "key: 'status'");
requireText('src/core/fields/FieldRegistry.ts', "key: 'cadence'");
forbid('src/core/fields/FieldEditPolicy.ts', [/status\s*:\s*['"]categoryKey['"]/]);
forbid('src/features/settings/layout/DataFilterPanel.tsx', [/['"]type['"]\s*,?\s*\/\//, /value=['"]type['"]/]);
requireText('src/core/recordInput/snapshot/OutputPlanner.ts', "trustedCoreBlock === 'task' ? ''");
forbid('src/core/recordInput/snapshot/OutputPlanner.ts', [/buildTaskRenderTokens/, /taskStatusPrefix/, /taskDateToken/, /repeatToken/, /-\s*\[\s*\]/]);
requireText('src/core/recordInput/EditBackfillMapper.ts', 'result.status = input.item.status');
requireText('src/core/recordInput/EditBackfillMapper.ts', 'result.seriesId = input.item.seriesId');
requireText('src/core/recordInput/snapshot/OutputPlanner.ts', 'task_series_recurrence_edit_requires_series_command');
requireText('src/core/types/cache.ts', 'CURRENT_CACHE_SCHEMA_VERSION = 12');
requireText('src/core/types/cache.ts', 'expectedDurationMinutes?: number');
requireText('src/core/types/cache.ts', 'scheduledDate?: string');

if (failures.length) {
  console.error('[task-consumer-v2-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[task-consumer-v2-gate] ok (${consumerRoots.length} consumer files scanned)`);
