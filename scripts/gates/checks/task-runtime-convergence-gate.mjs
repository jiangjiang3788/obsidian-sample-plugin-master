#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const timer = read('src/features/timer/TimerService.ts');
const taskRuntime = read('src/app/usecases/taskRuntime.usecase.ts');
const taskActions = read('src/app/actions/recordTaskActions.ts');
const quickInput = read('src/features/quickinput/modal/QuickInputModalContent.tsx');
const completionMutation = read('src/core/services/item/TaskCompletionMutation.ts');
const statsRequest = read('src/shared/types/actions.ts');
const statsPopover = read('src/features/views/runtime/StatisticsView/components/PopoverContent.tsx');
const timerButton = read('src/shared/ui/composites/TaskSendToTimerButton.tsx');
const energyTasks = read('src/features/views/models/energyTaskListModel.ts');
const energyModel = read('src/features/views/models/energyViewModel.ts');
const recordQuery = read('src/core/query/RecordQuery.ts');

if (!taskRuntime.includes('export class TaskRuntimeUseCase')) failures.push('TaskRuntimeUseCase must own Task runtime completion orchestration');
if (!taskRuntime.includes('this.timer.getTimers().filter((entry) => entry.taskId === taskId)')) failures.push('TaskRuntimeUseCase must resolve Timer context by canonical taskId');
if (!taskRuntime.includes("code: 'task_runtime_timer_context_ambiguous'")) failures.push('TaskRuntimeUseCase must reject ambiguous duplicate Timer contexts');
if (!taskRuntime.includes("params.command === 'complete' ? 'task-completed' : 'work-block-ended'")) failures.push('Task lifecycle runtime must derive Session result from lifecycle intent');
if (!taskRuntime.includes('await this.timer.removeTimer(activeTimer.id)')) failures.push('successful completion must clear Timer runtime in the same application workflow');
if (!taskActions.includes('params.useCases.taskRuntime.completeTask')) failures.push('dashboard/view completion must route through TaskRuntimeUseCase');
if (!quickInput.includes("useCases.taskRuntime.runLifecycle({ taskId: itemId, command, source: 'quickinput' })")) failures.push('QuickInput lifecycle actions must route through TaskRuntimeUseCase');
if (!quickInput.includes("useCases.taskRuntime.runLifecycle({ taskId: itemId, command: 'skip', source: 'quickinput' })")) failures.push('Recurring skip must route through TaskRuntimeUseCase');
if (!timer.includes('this.useCases.taskRuntime.completeTask')) failures.push('Timer panel completion must route through TaskRuntimeUseCase');
if (!completionMutation.includes('const at = sessionInput?.endedAt || timestampNow()')) failures.push('Task lifecycle timestamps must anchor to Session endedAt when an execution Session exists');
if (!completionMutation.includes('cancelItemWithSession') || !completionMutation.includes('skipItemWithSession')) failures.push('cancel/skip lifecycle transitions must support atomic final work-block Session capture');

// No UI/application surface may directly call submitCompleteRecord. The RecordInput
// use case owns persistence, while TaskRuntimeUseCase is the sole runtime orchestrator.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk('src').filter((file) => /\.(ts|tsx)$/.test(file))) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized.endsWith('/app/usecases/taskRuntime.usecase.ts') || normalized.endsWith('/app/usecases/recordInput.usecase.ts')) continue;
  const source = read(file);
  if (source.includes('.submitCompleteRecord(')) failures.push(`direct submitCompleteRecord bypass outside runtime boundary: ${normalized}`);
  if (source.includes('.submitTaskLifecycle(')) failures.push(`direct submitTaskLifecycle bypass outside runtime boundary: ${normalized}`);
}

if (!statsRequest.includes('onMarkDone: MarkDoneHandler')) failures.push('Statistics popover request must carry the Task completion action');
if (statsPopover.includes('onMarkDone={() => {}}')) failures.push('Statistics popover must not swallow Task checkbox actions');
if (!statsPopover.includes('onMarkDone={onMarkDone}')) failures.push('Statistics popover must forward the Task completion action');
if (!timerButton.includes("timerStatus === 'paused'") || !timerButton.includes('label="继续计时"')) failures.push('paused Tasks must be resumable from ordinary Task rows');
if (!timer.includes("if (existingTimer?.status === 'running') return;")) failures.push('restarting the already-running Task must be idempotent and must not split a Session');
if (!energyTasks.includes('completionHistoryMap') || !energyTasks.includes('dateRange: [Date, Date]')) failures.push('Energy completion history must be bound to the current layout dateRange');
if (!energyTasks.includes('const seriesId = text(item.seriesId)')) failures.push('Energy recurring completion identity must use stable seriesId');
if (energyTasks.includes("subtract(365, 'day')")) failures.push('Energy visible completion count must not use a hidden 365-day window');
if (energyTasks.includes('asTaskSessionRecord')) failures.push('Energy visible completion count must not count TaskSession as Task completion');
if (!energyModel.includes('dateRange,')) failures.push('Energy view model must pass the active layout dateRange to its Task list model');
if (!recordQuery.includes('if (isOpenTask(item)) return true;')) failures.push('default layout date must keep open backlog Tasks alive');
const viewProps = read('src/app/dashboard/viewPropsFactory.ts');
const layoutRenderer = read('src/app/dashboard/LayoutRenderer.tsx');
if (!viewProps.includes('onMarkDone,') || !viewProps.includes('timerService,') || !viewProps.includes('timers,')) failures.push('all registered views must receive the shared Task completion and Timer runtime actions');
if (!layoutRenderer.includes('onMarkDone={handleMarkItemDone}') || !layoutRenderer.includes('timerService={timerService}') || !layoutRenderer.includes('timers={timers}')) failures.push('LayoutRenderer must inject one shared Task runtime wiring into every ViewContent');


if (failures.length) {
  console.error('Task runtime convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Task runtime convergence gate passed (one runtime completion workflow across View/QuickInput/Timer).');
