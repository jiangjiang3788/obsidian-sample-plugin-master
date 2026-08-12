#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function check_task_foundation_v2_gate() {
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
}

check_task_foundation_v2_gate();

function check_task_domain_v2_gate() {
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
  requireText('src/core/records/task/RecurrenceTypes.ts', "type RecurrenceAnchor = 'scheduled' | 'start' | 'due' | 'completion'");
  requireText('src/core/records/RecordEntity.ts', "coreBlock: 'task-series'");
  requireText('src/core/records/task/taskDomain.ts', 'type TaskSeriesRecord = RuntimeTaskSeriesRecord');
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
}

check_task_domain_v2_gate();

function check_task_session_v2_gate() {
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
  requireText('src/core/records/RecordEntity.ts', "coreBlock: 'task-session'");
  requireText('src/core/records/task/taskSession.ts', 'type TaskSessionRecord = RuntimeTaskSessionRecord');
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
}

check_task_session_v2_gate();

function check_task_consumer_v2_gate() {
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
  requireText('src/features/views/runtime/timeline-parser.ts', 'asTaskSessionRecord');
  requireText('src/features/views/runtime/timeline-parser.ts', 'sessionRecordId: session.id');
  forbid('src/features/views/runtime/timeline-parser.ts', [/categoryKey\s*===/, /rawSource/, /item\.type/]);
  requireText('src/core/services/item/TaskSessionMutation.ts', 'linkEnergySnapshot');
  requireText('src/core/services/item/TaskSessionMutation.ts', 'updateSessionTime');
  requireText('src/core/fields/FieldRegistry.ts', "key: 'status'");
  requireText('src/core/fields/FieldRegistry.ts', "key: 'cadence'");
  forbid('src/core/fields/FieldEditPolicy.ts', [/status\s*:\s*['"]categoryKey['"]/]);
  forbid('src/features/settings/layout/DataFilterPanel.tsx', [/['"]type['"]\s*,?\s*\/\//, /value=['"]type['"]/]);
  requireText('src/core/recordInput/snapshot/OutputPlanner.ts', "if (coreBlock === 'task')");
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
}

check_task_consumer_v2_gate();

function check_no_task_line_runtime_gate() {
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

  const recordEntity = fs.readFileSync('src/core/records/RecordEntity.ts', 'utf8');
  if (/\btype\s*:\s*['"]task['"]\s*\|\s*['"]block['"]/.test(recordEntity)) failures.push('RecordEntity.ts: Item.type task/block must not exist');
  if (/\brecurrence\??\s*:\s*string\b/.test(recordEntity)) failures.push('RecordEntity.ts: recurrence string projection must not exist');

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
}

check_no_task_line_runtime_gate();
