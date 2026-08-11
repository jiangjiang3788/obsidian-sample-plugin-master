import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const quality = read('src/core/energy/quality.ts');
const model = read('src/features/settings/views/models/energyViewModel.ts');
const taskModel = read('src/features/settings/views/models/energyTaskListModel.ts');
const energyView = read('src/features/settings/views/runtime/EnergyView.tsx');

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
