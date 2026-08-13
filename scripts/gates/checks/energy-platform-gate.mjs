#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function check_energy_recommendation_pipeline_gate() {
  const root = process.cwd();
  const recurrence = fs.readFileSync(path.join(root, 'src/core/records/task/taskRecurrence.ts'), 'utf8');
  const candidates = fs.readFileSync(path.join(root, 'src/core/energy/recommendationCandidates.ts'), 'utf8');
  const model = fs.readFileSync(path.join(root, 'src/features/views/models/energyTaskListModel.ts'), 'utf8');
  const view = fs.readFileSync(path.join(root, 'src/features/views/runtime/EnergyView.tsx'), 'utf8');
  const taskView = fs.readFileSync(path.join(root, 'src/features/views/runtime/EnergyTaskList.tsx'), 'utf8');
  const test = fs.readFileSync(path.join(root, 'test/unit/energyRecommendationCandidates.test.ts'), 'utf8');

  const failures = [];
  if (!recurrence.includes("Boolean(String(item.seriesId || '').trim())")) failures.push('task recurrence identity must use stable seriesId');
  if (/\.rawSource\b/.test(recurrence) || recurrence.includes('parseRecurrence(')) failures.push('task recurrence must not fall back to raw Markdown parsing');
  if (!candidates.includes('isTaskRecurring(item)')) failures.push('candidate eligibility must use canonical recurrence semantics');
  if (candidates.includes('staleScheduledTask(')) failures.push('open backlog must not be hard-deleted by stale scheduled date');
  if (!candidates.includes("return 'future-task'")) failures.push('future task availability must remain explicit');
  if (!candidates.includes('buildEnergyActionCandidateResult')) failures.push('candidate discovery must expose diagnostics');
  if (!model.includes('buildEnergyActionCandidateResult(items')) failures.push('Unified Energy task model must consume the candidate pipeline');
  if (!model.includes('includeRecurringTasks: true')) failures.push('Unified task pool must include recurring tasks');
  if (!model.includes('buildEnergyActionRecommendations')) failures.push('Energy intelligence must rank the unified task pool');
  if (view.includes('goalPath: task.goalPath')) failures.push('Energy execution context must remain global and must not carry Task Goal as an Energy boundary');
  if (view.includes('EnergyRecommendationList')) failures.push('legacy heavy recommendation component must stay retired');
  if (!model.includes('recommendations: EnergyTaskListItemVM[]')) failures.push('Energy task model must expose a lightweight Top recommendation projection');
  if (!taskView.includes('现在适合') || !taskView.includes('model.recommendations')) failures.push('Energy task surface must make Top recommendations perceivable without a card system');
  if (!test.includes("seriesId: 'taskseries.daily'")) failures.push('candidate tests must cover stable recurring series identity');

  if (failures.length) {
    console.error('Energy recommendation pipeline gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Energy recommendation pipeline gate passed.');
}

check_energy_recommendation_pipeline_gate();

function check_energy_ui_unicode_gate() {
  const root = process.cwd();
  const runtimeDir = path.join(root, 'src/features/views/runtime');
  const files = fs.readdirSync(runtimeDir).filter((name) => /^Energy.*\.tsx$/.test(name));
  const failures = [];

  for (const name of files) {
    const full = path.join(runtimeDir, name);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      // JSX raw text does not interpret JavaScript unicode escapes. Catch the two forms that
      // caused literal "\\uXXXX" text in the UI while allowing escaped strings inside {...}.
      if (/>[^<{]*\\u[0-9a-fA-F]{4}/.test(line) || /}\s*\\u[0-9a-fA-F]{4}/.test(line)) {
        failures.push(`${name}:${index + 1}: raw JSX unicode escape`);
      }
    });
  }

  if (failures.length) {
    console.error('Energy UI Unicode gate failed:\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log(`Energy UI Unicode gate passed (${files.length} Energy TSX files).`);
}

check_energy_ui_unicode_gate();

function check_energy_learning_gate() {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const learning = read('src/core/energy/recommendationLearning.ts');
  const candidates = read('src/core/energy/recommendationCandidates.ts');
  const model = read('src/features/views/models/energyTaskListModel.ts');
  const viewModel = read('src/features/views/models/energyViewModel.ts');
  const content = read('src/app/dashboard/ViewContent.tsx');

  const checks = [
    ['persistent TaskSession evidence', learning.includes('asTaskSessionRecord') && learning.includes('endEnergyRecordId') && learning.includes('energyDelta')],
    ['series-level learning survives instance rollover', learning.includes('bySeriesId') && learning.includes('candidate.seriesId')],
    ['TimerRuntime is not historical evidence', !learning.includes('TimerState') && !learning.includes('feedback-recorded') && !learning.includes('energyFeedback')],
    ['activity classification on candidates', candidates.includes('activityLabel: classifyEnergyActivity(item)')],
    ['personal evidence enriches real tasks', model.includes('attachEnergyRecommendationLearning') && model.includes('attachEnergyRecommendationEvidence')],
    ['virtual recovery actions stay out of task surface', !model.includes('buildEnergyRecoveryActionCandidates')],
    ['learning consumes internal Record evidence', model.includes('buildEnergyRecommendationLearning(historyItems)') && viewModel.includes('historyItems: records') && content.includes('allRecords')],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error('Energy learning gate failed: ' + failed.join(', '));
    process.exit(1);
  }
  console.log('Energy learning gate passed.');
}

check_energy_learning_gate();

function check_energy_quality_gate() {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const quality = read('src/core/energy/quality.ts');
  const model = read('src/features/views/models/energyViewModel.ts');
  const taskModel = read('src/features/views/models/energyTaskListModel.ts');
  const energyView = read('src/features/views/runtime/EnergyView.tsx');

  const checks = [
    ['quality model exists', quality.includes('buildEnergyDataQuality') && quality.includes("'limited' | 'usable' | 'strong'")],
    ['missing stays missing', !quality.includes('interpolat') && quality.includes('sampledDays')],
    ['retrospective remains separate', quality.includes('retrospectiveSamples') && quality.includes('exactTimeSamples')],
    ['period review uses quality', model.includes('compactReviewLines') && model.includes('quality.message')],
    ['task ranking uses latest Energy when available', taskModel.includes('management?.latest') && taskModel.includes('buildEnergyActionRecommendations')],
    ['diagnostics stay out of the default Energy surface', !energyView.includes('EnergyMoreSummary')],
  ];

  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error('Energy quality gate failed: ' + failed.join(', '));
    process.exit(1);
  }
  console.log('Energy quality gate passed.');
}

check_energy_quality_gate();

function check_energy_task_merge_gate() {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const viewConfig = read('src/core/view/ViewConfig.ts');
  const taskModel = read('src/features/views/models/energyTaskListModel.ts');
  const cadence = read('src/core/records/task/taskCadence.ts');
  const taskView = read('src/features/views/runtime/EnergyTaskList.tsx');
  const energyView = read('src/features/views/runtime/EnergyView.tsx');
  const timer = read('src/features/timer/TimerService.ts');
  const timerRow = read('src/features/timer/TimerRow.tsx');

  const failures = [];
  const activeViewLine = viewConfig.split(/\r?\n/).find((line) => line.startsWith('export const VIEW_OPTIONS')) || '';
  if (activeViewLine.includes('TaskExecutionView')) failures.push('TaskExecutionView must not be an active selectable view');
  if (viewConfig.includes('LEGACY_VIEW_OPTIONS')) failures.push('current-only build must not keep a legacy TaskExecutionView type');
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
  if (!timerRow.includes('建议倒计时') || !timerRow.includes('formatSecondsToHHMMSS(remaining)')) failures.push('Energy timer must restore a visible countdown from the suggested duration');
  if (timerRow.includes('停止点已到')) failures.push('suggested duration must not become an alarm');

  if (failures.length) {
    console.error('Energy task merge gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Energy task merge gate passed.');
}

check_energy_task_merge_gate();

function check_energy_task_match_gate() {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const recommendation = read('src/core/energy/recommendation.ts');
  const taskModel = read('src/features/views/models/energyTaskListModel.ts');
  const taskView = read('src/features/views/runtime/EnergyTaskList.tsx');
  const taskCss = read('src/styles/features/energy-task-list.css');

  const failures = [];
  if (!recommendation.includes('Math.abs(gap)') || !recommendation.includes('gap < -5')) failures.push('Energy/task load fit must use distance matching with an under-capacity penalty');
  if (!taskModel.includes('energyMatched: boolean')) failures.push('task VM must expose lightweight Energy match state');
  if (!taskModel.includes('candidate.brainLoad') || !taskModel.includes('candidate.physicalLoad')) failures.push('star eligibility must require an actual Energy signal');
  if (!taskModel.includes('.slice(0, 5)')) failures.push('Energy match marker must remain sparse');
  if (!taskView.includes('think-energy-task-list__energy-match')) failures.push('task list must render the Energy match marker');
  if (!taskView.includes('★')) failures.push('Energy match marker must use the compact star affordance');
  if (!taskCss.includes('.think-energy-task-list__energy-match')) failures.push('Energy match marker CSS is missing');

  if (failures.length) {
    console.error('Energy task match gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Energy task match gate passed.');
}

check_energy_task_match_gate();

function check_energy_recommendation_v2_gate() {
  const read = (file) => fs.readFileSync(file, 'utf8');
  const candidates = read('src/core/energy/recommendationCandidates.ts');
  const recommendation = read('src/core/energy/recommendation.ts');
  const policy = read('src/core/energy/actionPolicy.ts');
  const completion = read('src/core/services/item/TaskCompletionMutation.ts');
  const energyView = read('src/features/views/runtime/EnergyView.tsx');
  const taskView = read('src/features/views/runtime/EnergyTaskList.tsx');
  const timer = read('src/features/timer/TimerService.ts');
  const updateWorkflow = read('src/app/usecases/recordInput/workflows/UpdateRecordWorkflow.ts');
  const cache = read('src/core/types/cache.ts');
  const failures = [];

  for (const field of ['item.energyDemand', 'item.brainDemand', 'item.physicalDemand', 'item.availabilityContexts', 'item.recoveryIntent']) {
    if (!candidates.includes(field)) failures.push(`candidate pipeline must consume canonical ${field}`);
  }
  for (const legacy of ["item.extra?.['精力要求']", "item.extra?.['脑力要求']", "item.extra?.['体力要求']"]) {
    if (candidates.includes(legacy)) failures.push(`canonical Energy task demand must not fall back to ${legacy}`);
  }
  if (!candidates.includes("return 'context-unavailable'")) failures.push('availability context must be a hard candidate boundary');
  if (!candidates.includes('history.bySeriesId.get(seriesId)')) failures.push('duration learning must be isolated by TaskSeries identity');
  if (candidates.includes('goalId') && candidates.includes('themePath') && candidates.includes('durationByGoal')) failures.push('duration learning must not borrow unrelated Goal/Theme sessions');
  if (!policy.includes('Math.max(1')) failures.push('Energy timing must allow one-minute micro tasks');
  for (const field of ['series.energyDemand', 'series.brainDemand', 'series.physicalDemand', 'series.availabilityContexts', 'series.recoveryIntent']) {
    if (!completion.includes(field)) failures.push(`next recurring occurrence must inherit canonical ${field}`);
  }
  if (!energyView.includes('baselineEnergyItemId: baseline.itemId')) failures.push('Energy start must preserve the source Energy Record id for before/after learning');
  if (!updateWorkflow.includes('updateTaskSeries(seriesId, taskSeriesDefaults(renderData)')) failures.push('editing a recurring Task must synchronize recommendation defaults back to TaskSeries');
  if (!timer.includes('Math.max(1, Math.min(240')) failures.push('Timer must preserve one-minute Energy countdowns');
  if (!taskView.includes('model.recommendations') || !taskView.includes('recommendationReason') || !taskView.includes('title={taskHover(task)}')) failures.push('Top recommendations must be visible while explanation stays in hover text');
  if (!taskView.includes('onContextChange') || !taskView.includes("value: 'work'") || !taskView.includes("value: 'home'")) failures.push('Energy task surface must expose a lightweight current-context selector');
  for (const field of ['energyDemand', 'brainDemand', 'physicalDemand', 'availabilityContexts', 'recoveryIntent']) {
    if (!cache.includes(`${field}:`)) failures.push(`cache must preserve canonical ${field}`);
  }
  if (!recommendation.includes('opportunityCostPenalty') || !recommendation.includes("band === 'use-capacity'")) failures.push('high Energy must model opportunity cost instead of always preferring micro tasks');

  if (failures.length) {
    console.error('Energy Recommendation V2 gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Energy Recommendation V2 gate passed (availability -> value -> energy opportunity -> duration -> learning).');
}

check_energy_recommendation_v2_gate();

function check_energy_architecture_convergence_gate() {
  const read = (f) => fs.readFileSync(f, 'utf8');
  const failures = [];
  const timerTypes = read('src/core/types/timer.ts');
  const timerService = read('src/features/timer/TimerService.ts');
  const recordInput = read('src/app/usecases/recordInput.usecase.ts');
  const taskModel = read('src/features/views/models/energyTaskListModel.ts');
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
}

check_energy_architecture_convergence_gate();
