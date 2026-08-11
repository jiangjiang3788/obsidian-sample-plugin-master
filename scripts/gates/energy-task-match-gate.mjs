import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const recommendation = read('src/core/energy/recommendation.ts');
const taskModel = read('src/features/settings/views/models/energyTaskListModel.ts');
const taskView = read('src/features/settings/views/runtime/EnergyTaskList.tsx');
const taskCss = read('src/styles/features/energy-task-list.css');

const failures = [];
if (!recommendation.includes('Math.abs(gap) * 0.35')) failures.push('Energy/task load fit must use distance matching, not affordability-only matching');
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
