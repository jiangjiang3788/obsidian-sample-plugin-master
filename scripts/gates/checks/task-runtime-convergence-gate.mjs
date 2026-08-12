#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const timer = read('src/features/timer/TimerService.ts');
const actions = read('src/app/dashboard/useLayoutModuleActions.ts');
const statsRequest = read('src/shared/types/actions.ts');
const statsPopover = read('src/features/views/runtime/StatisticsView/components/PopoverContent.tsx');
const timerButton = read('src/shared/ui/composites/TaskSendToTimerButton.tsx');
const energyTasks = read('src/features/views/models/energyTaskListModel.ts');
const energyModel = read('src/features/views/models/energyViewModel.ts');
const recordQuery = read('src/core/query/RecordQuery.ts');

if (!timer.includes('public async completeTask(taskId: string)')) failures.push('TimerService must own the single Task completion boundary');
if (!timer.includes('if (timer) return this.stopAndApply(timer.id)')) failures.push('active Timer completion must persist Session and clear runtime through stopAndApply');
if (!actions.includes('timerService.completeTask')) failures.push('layout Task checkboxes must route through TimerService.completeTask');
if (!statsRequest.includes('onMarkDone: MarkDoneHandler')) failures.push('Statistics popover request must carry the Task completion action');
if (statsPopover.includes('onMarkDone={() => {}}')) failures.push('Statistics popover must not swallow Task checkbox actions');
if (!statsPopover.includes('onMarkDone={onMarkDone}')) failures.push('Statistics popover must forward the Task completion action');
if (!timerButton.includes("timerStatus === 'paused'") || !timerButton.includes('label="继续计时"')) failures.push('paused Tasks must be resumable from ordinary Task rows');
if (!energyTasks.includes('completionHistoryMap') || !energyTasks.includes('dateRange: [Date, Date]')) failures.push('Energy completion history must be bound to the current layout dateRange');
if (!energyTasks.includes('const seriesId = text(item.seriesId)')) failures.push('Energy recurring completion identity must use stable seriesId');
if (energyTasks.includes("subtract(365, 'day')")) failures.push('Energy visible completion count must not use a hidden 365-day window');
if (energyTasks.includes('asTaskSessionRecord')) failures.push('Energy visible completion count must not count TaskSession as Task completion');
if (!energyModel.includes('dateRange,')) failures.push('Energy view model must pass the active layout dateRange to its Task list model');
if (!recordQuery.includes('if (isOpenTask(item)) return true;')) failures.push('default layout date must keep open backlog Tasks alive');

if (failures.length) {
  console.error('Task runtime convergence gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Task runtime convergence gate passed (single completion boundary; period-correct Energy history).');
