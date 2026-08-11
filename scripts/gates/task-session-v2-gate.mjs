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

forbid('src/core/types/timer.ts', [/awaiting-energy/, /feedback-recorded/, /energyFeedback\??:/, /completedAt\??:/]);
requireText('src/core/types/timer.ts', "export type TimerStatus = 'running' | 'paused'");
requireText('src/core/types/timer.ts', 'startedAt: number');
requireText('src/core/services/TimerStateService.ts', 'TIMER_RUNTIME_SCHEMA_VERSION = 2');
forbid('src/core/services/TimerStateService.ts', [/feedback-recorded/, /awaiting-energy/]);
requireText('src/core/records/task/taskSession.ts', "coreBlock: 'task-session'");
requireText('src/core/records/codec/MarkdownRecordCodec.ts', "document.coreBlock === 'task-session'");
requireText('src/core/records/RecordIndex.ts', "code: 'task_session_reference_orphan'");
requireText('src/core/services/item/TaskCompletionMutation.ts', 'completeItemWithSession');
requireText('src/core/services/item/TaskCompletionMutation.ts', 'operations.push(sessionOperation)');
requireText('src/features/timer/TimerService.ts', 'submitTaskSession');
requireText('src/features/timer/TimerService.ts', "'task-completed'");
forbid('src/features/timer/TimerService.ts', [/awaiting-energy/, /feedback-recorded/, /energyFeedback/, /submitUpdateRecordTime/, /-\s*\[\s*\]/]);
forbid('src/app/usecases/recordInput.usecase.ts', [/attachEnergyTaskFeedback/, /feedback-recorded/, /awaiting-energy/]);
forbid('src/core/energy/recommendationLearning.ts', [/TimerState/, /feedback-recorded/, /energyFeedback/]);
requireText('src/core/energy/record.ts', "recordId: createRecordId('energy')");
requireText('src/core/energy/record.ts', "coreBlock: 'energy'");
requireText('src/core/types/cache.ts', 'CURRENT_CACHE_SCHEMA_VERSION = 12');

if (failures.length) {
  console.error('[task-session-v2-gate] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[task-session-v2-gate] ok');
