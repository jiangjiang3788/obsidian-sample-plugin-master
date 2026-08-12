import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function requireText(rel, text, message) {
  if (!read(rel).includes(text)) failures.push(`${rel}: ${message}`);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const srcFiles = walk(path.join(root, 'src'));
for (const full of srcFiles) {
  const rel = path.relative(root, full).replaceAll('\\', '/');
  const text = fs.readFileSync(full, 'utf8');
  if (/\.(goalPaths|goalIds)\b/.test(text) || /['"]goalPaths['"]/.test(text) || /['"]goalIds['"]/.test(text)) {
    failures.push(`${rel}: plural Goal compatibility fields are forbidden`);
  }
  if (/stripLeadingHashes/.test(text)) failures.push(`${rel}: hierarchy paths must not contain hash-stripping compatibility`);
  if (/semantic\s*(?:===|:)\s*['"]goals['"]/.test(text)) {
    failures.push(`${rel}: Goal must use single goalPath semantic, not tag-like goals semantic`);
  }
}

requireText('src/core/fields/CoreFieldCatalog.ts', "label: '目标', type: 'hierarchicalSingleSelect', target: 'goalPath'", 'Goal core field must be a single hierarchical path');
requireText('src/core/fields/FieldRegistry.ts', "goalPath: text({ key: 'goalPath', label: '目标'", 'FieldRegistry must expose single goalPath');
requireText('src/core/goal/path.ts', "value.includes('#') || value.includes('＃')", 'Goal parser must reject tag markers instead of stripping them');
requireText('src/core/goal/invariants.ts', 'GoalTemplate', 'Goal settings invariant must reject persisted Goal defaults');

requireText('src/core/services/SettingsRepository.ts', 'assertCanonicalGoalSettings(newSettings.goalSettings)', 'Settings writes must validate canonical Goal settings before persistence');
requireText('src/core/recordInput/snapshot/OutputPlanner.ts', 'requireGoalPath(rawGoalPath)', 'Record writes must reject non-canonical Goal paths');
requireText('src/core/records/RecordNormalizer.ts', 'invalid_record_goal_identity', 'Record reads must enforce paired goalId + goalPath');
requireText('src/core/services/GoalTemplateResolver.ts', 'findGoal(settings.goalSettings, input.goalId)', 'GoalTemplate resolution must use goalId identity');

if (failures.length) {
  console.error('[goal-domain-gate] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[goal-domain-gate] PASS (Goal is single-valued entity hierarchy; Tag owns # syntax)');
