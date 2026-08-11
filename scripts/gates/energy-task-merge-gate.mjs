import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const schema = read('src/core/types/schema.ts');
const taskModel = read('src/features/settings/views/models/energyTaskListModel.ts');
const cadence = read('src/core/records/task/taskCadence.ts');
const taskView = read('src/features/settings/views/runtime/EnergyTaskList.tsx');
const energyView = read('src/features/settings/views/runtime/EnergyView.tsx');
const timer = read('src/features/timer/TimerService.ts');
const timerRow = read('src/features/timer/TimerRow.tsx');

const failures = [];
const activeViewLine = schema.split(/\r?\n/).find((line) => line.startsWith('export const VIEW_OPTIONS')) || '';
if (activeViewLine.includes('TaskExecutionView')) failures.push('TaskExecutionView must not be an active selectable view');
if (schema.includes('LEGACY_VIEW_OPTIONS')) failures.push('current-only build must not keep a legacy TaskExecutionView type');
if (!taskModel.includes('EnergyTaskGoalVM')) failures.push('task surface must group by Goal first');
for (const label of ['日常任务', '天任务', '周任务', '月任务', '季任务', '年任务']) {
  if (!cadence.includes(label)) failures.push(`canonical Task cadence is missing: ${label}`);
}
if (!taskModel.includes('getTaskCadence')) failures.push('Energy task list must consume Task-domain cadence classification');
if (taskModel.includes('classifyEnergyTaskCadence')) failures.push('Energy feature must not own cadence taxonomy');
if (!taskModel.includes('includeRecurringTasks: true')) failures.push('recurring and ordinary tasks must share the Energy task pool');
if (!taskModel.includes('createGoalOrderIndex')) failures.push('Goal sections must use canonical settings order instead of Energy rank');
if (taskModel.includes('buildEnergyRecoveryActionCandidates')) failures.push('virtual recovery actions must not enter the real task list');
if (!taskView.includes('model.goals') || !taskView.includes('goal.rows')) failures.push('runtime must render Goal -> cadence rows');
if (!energyView.includes('<EnergyTaskList')) failures.push('EnergyView must own the unified task list');
if (energyView.includes('EnergyRecommendationList')) failures.push('heavy recommendation UI must remain retired');
if (energyView.includes('startRecommended')) failures.push('legacy recommendation-start fallback must be removed');
if (!timer.includes('endWorkBlock')) failures.push('Timer must support ending a work block without completing the task');
if (!timerRow.includes('结束本次') || !timerRow.includes('完成任务')) failures.push('ordinary timer UI must expose B semantics');
if (!timerRow.includes('建议工作块')) failures.push('Timer must display the suggested work-block length');
if (timerRow.includes('停止点已到')) failures.push('suggested duration is display-only and must not become an alarm');

if (failures.length) {
  console.error('Energy task merge gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Energy task merge gate passed.');
