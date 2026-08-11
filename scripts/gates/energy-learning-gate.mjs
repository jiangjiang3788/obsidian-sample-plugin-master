import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const learning = read('src/core/energy/recommendationLearning.ts');
const candidates = read('src/core/energy/recommendationCandidates.ts');
const model = read('src/features/settings/views/models/energyTaskListModel.ts');
const viewModel = read('src/features/settings/views/models/energyViewModel.ts');
const content = read('src/features/settings/layout/ViewContent.tsx');

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
