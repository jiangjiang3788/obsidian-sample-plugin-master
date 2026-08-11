import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const failures = [];
const timerTypes = read('src/core/types/timer.ts');
const timerService = read('src/features/timer/TimerService.ts');
const recordInput = read('src/app/usecases/recordInput.usecase.ts');
const taskModel = read('src/features/settings/views/models/energyTaskListModel.ts');
const colors = read('src/styles/tokens/data-colors.css');
const mainCss = read('src/styles/main.css');
if (timerTypes.includes('recommendation?:') || timerTypes.includes('recommendationFeedback')) failures.push('legacy recommendation timer terminology must stay removed');
if (!timerTypes.includes('energyContext?:')) failures.push('Timer Energy start context is missing');
if (timerTypes.includes('energyFeedback?:') || timerTypes.includes('awaiting-energy') || timerTypes.includes('feedback-recorded')) failures.push('TimerRuntime must not own completed feedback/history');
if (timerService.includes('startRecommended')) failures.push('legacy recommendation timer API must be removed');
if (recordInput.includes('attachEnergyTaskFeedback') || recordInput.includes('feedback-recorded')) failures.push('Record input must not bind Energy feedback through TimerRuntime');
if (recordInput.includes('goalPath === record.goalPath')) failures.push('Energy feedback is human-state feedback and must not be constrained by Task Goal');
if (!taskModel.includes('getTaskCadence')) failures.push('Task cadence must come from Task domain');
for (const token of ['day-bg','week-bg','month-bg','quarter-bg','year-bg','year-text']) {
  if (!colors.includes(`--think-task-cadence-${token}`)) failures.push(`missing semantic cadence token: ${token}`);
}
for (const dead of ['energy-weekly.css','energy-experiment.css','energy-patterns.css','energy-management.css']) {
  if (mainCss.includes(dead)) failures.push(`dead Energy UI stylesheet must not load: ${dead}`);
}
if (failures.length) { console.error('Energy architecture convergence gate failed:'); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log('Energy architecture convergence gate passed.');
