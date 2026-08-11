import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const learning = read('src/core/energy/recommendationLearning.ts');
const candidates = read('src/core/energy/recommendationCandidates.ts');
const model = read('src/features/settings/views/models/energyTaskListModel.ts');
const content = read('src/features/settings/layout/ViewContent.tsx');

const checks = [
  ['global Energy evidence', learning.includes('requireSharedGoal: false')],
  ['recommendation feedback learning', learning.includes('recommendation-feedback') && learning.includes('feedback-recorded')],
  ['activity classification on candidates', candidates.includes('activityLabel: classifyEnergyActivity(item)')],
  ['personal evidence enriches real tasks', model.includes('attachEnergyRecommendationLearning') && model.includes('attachEnergyRecommendationEvidence')],
  ['virtual recovery actions stay out of task surface', !model.includes('buildEnergyRecoveryActionCandidates')],
  ['timer feedback enters render model', model.includes('buildEnergyRecommendationLearning') && content.includes('timers,')],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('Energy learning gate failed: ' + failed.join(', '));
  process.exit(1);
}
console.log('Energy learning gate passed.');
