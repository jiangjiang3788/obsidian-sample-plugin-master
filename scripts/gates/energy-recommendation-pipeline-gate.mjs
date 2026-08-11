import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const recurrence = fs.readFileSync(path.join(root, 'src/core/records/task/taskRecurrence.ts'), 'utf8');
const candidates = fs.readFileSync(path.join(root, 'src/core/energy/recommendationCandidates.ts'), 'utf8');
const model = fs.readFileSync(path.join(root, 'src/features/settings/views/models/energyTaskListModel.ts'), 'utf8');
const view = fs.readFileSync(path.join(root, 'src/features/settings/views/runtime/EnergyView.tsx'), 'utf8');
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
if (view.includes('EnergyRecommendationList')) failures.push('Recommendation must be ordering, not a second UI list');
if (!test.includes("seriesId: 'taskseries.daily'")) failures.push('candidate tests must cover stable recurring series identity');

if (failures.length) {
  console.error('Energy recommendation pipeline gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Energy recommendation pipeline gate passed.');
