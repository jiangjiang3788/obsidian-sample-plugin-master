#!/usr/bin/env node
// Legacy wrapper files may stay temporarily for external/deep-import compatibility,
// but first-party code should import the real module barrels directly.

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const scanRoots = ['src', 'test'];
const ignoredFiles = new Set([
  'src/shared/ui/views/TimelineView.tsx',
  'src/shared/ui/views/EventTimelineView.tsx',
  'src/shared/ui/views/StatisticsView.tsx',
  'src/shared/ui/views/index.ts',
  'src/core/utils/themeUtils.ts',
  'src/core/utils/index.ts',
  'src/features/progression/types.ts',
  'src/features/progression/computeProgression.ts',
  'src/features/settings/SettingsTab.tsx',
  'src/features/quickinput/QuickInputModal.tsx',
]);

const forbidden = [
  {
    name: 'legacy TimelineView forwarder',
    patterns: [
      /from\s+['"](?:@shared\/ui\/views\/TimelineView|\.\/TimelineView)['"]/,
      /from\s+['"](?:@\/shared\/ui\/views\/TimelineView|src\/shared\/ui\/views\/TimelineView)['"]/,
    ],
    guidance: "import from './TimelineView/index' or '@shared/public' instead",
  },
  {
    name: 'legacy EventTimelineView forwarder',
    patterns: [
      /from\s+['"](?:@shared\/ui\/views\/EventTimelineView|\.\/EventTimelineView)['"]/,
      /from\s+['"](?:@\/shared\/ui\/views\/EventTimelineView|src\/shared\/ui\/views\/EventTimelineView)['"]/,
    ],
    guidance: "import from './EventTimelineView/index' or '@shared/public' instead",
  },
  {
    name: 'legacy StatisticsView forwarder',
    patterns: [
      /from\s+['"](?:@shared\/ui\/views\/StatisticsView|\.\/StatisticsView)['"]/,
      /from\s+['"](?:@\/shared\/ui\/views\/StatisticsView|src\/shared\/ui\/views\/StatisticsView)['"]/,
    ],
    guidance: "import from './StatisticsView/index' or '@shared/public' instead",
  },
  {
    name: 'legacy themeUtils wrapper',
    patterns: [
      /from\s+['"](?:@\/core\/utils\/themeUtils|@core\/utils\/themeUtils|\.\.?\/.*themeUtils)['"]/,
    ],
    guidance: "import ThemeTreeBuilder helpers from '@core/public' or '@/core/theme/ThemeTreeBuilder' instead",
  },
];

const failures = [];

function walk(filePath) {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(filePath)) walk(path.join(filePath, entry));
    return;
  }
  if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) return;
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (ignoredFiles.has(rel)) return;
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const rule of forbidden) {
      if (rule.patterns.some((pattern) => pattern.test(line))) {
        failures.push(`${rel}:${idx + 1}: ${rule.name}: ${line.trim()} (${rule.guidance})`);
      }
    }
  });
}

for (const scanRoot of scanRoots) walk(path.join(root, scanRoot));

if (failures.length) {
  console.error('legacy-forwarder-usage-gate failed: first-party code must not depend on legacy wrapper forwarders');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('legacy-forwarder-usage-gate passed');
