#!/usr/bin/env node
// Tracks cleanup candidates that are no longer used by first-party code.
// This is intentionally lightweight and deterministic: it does not try to be
// a full tree-shaker, but it does protect known legacy wrappers from being
// reintroduced through project imports or public barrels.

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const scanRoots = ['src', 'test'];
const sourceExt = /\.(ts|tsx|js|jsx)$/;

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

const candidates = [
  {
    name: 'legacy TimelineView forwarder',
    file: 'src/shared/ui/views/TimelineView.tsx',
    importPatterns: [
      /from\s+['"](?:@shared\/ui\/views\/TimelineView|@\/shared\/ui\/views\/TimelineView)['"]/, 
      /from\s+['"](?:\.\/TimelineView|\.\.\/views\/TimelineView)['"]/, 
    ],
  },
  {
    name: 'legacy EventTimelineView forwarder',
    file: 'src/shared/ui/views/EventTimelineView.tsx',
    importPatterns: [
      /from\s+['"](?:@shared\/ui\/views\/EventTimelineView|@\/shared\/ui\/views\/EventTimelineView)['"]/, 
      /from\s+['"](?:\.\/EventTimelineView|\.\.\/views\/EventTimelineView)['"]/, 
    ],
  },
  {
    name: 'legacy StatisticsView forwarder',
    file: 'src/shared/ui/views/StatisticsView.tsx',
    importPatterns: [
      /from\s+['"](?:@shared\/ui\/views\/StatisticsView|@\/shared\/ui\/views\/StatisticsView)['"]/, 
      /from\s+['"](?:\.\/StatisticsView|\.\.\/views\/StatisticsView)['"]/, 
    ],
  },
  {
    name: 'legacy themeUtils wrapper',
    file: 'src/core/utils/themeUtils.ts',
    importPatterns: [
      /from\s+['"](?:@core\/utils\/themeUtils|@\/core\/utils\/themeUtils)['"]/, 
      /from\s+['"][^'"]*themeUtils['"]/, 
    ],
    forbiddenPublicExports: [
      { file: 'src/core/utils/index.ts', pattern: /export\s+\*\s+from\s+['"]\.\/themeUtils['"]/ },
    ],
  },
];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (sourceExt.test(entry.name)) out.push(full);
  }
  return out;
}

const files = scanRoots.flatMap((scanRoot) => walk(path.join(root, scanRoot)));
const failures = [];

for (const candidate of candidates) {
  if (!fs.existsSync(path.join(root, candidate.file))) {
    // Already deleted is acceptable; keep this gate compatible with future cleanup.
    continue;
  }

  for (const publicExport of candidate.forbiddenPublicExports ?? []) {
    const file = path.join(root, publicExport.file);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (publicExport.pattern.test(source)) {
      failures.push(`${publicExport.file}: should not publicly export ${candidate.name}`);
    }
  }

  for (const file of files) {
    const fileRel = rel(file);
    if (ignoredFiles.has(fileRel)) continue;
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (candidate.importPatterns.some((pattern) => pattern.test(line))) {
        failures.push(`${fileRel}:${index + 1}: imports ${candidate.name}: ${line.trim()}`);
      }
    });
  }
}

if (failures.length) {
  console.error('❌ [unused-export-candidates-gate] Known cleanup candidates are still referenced.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('✅ [unused-export-candidates-gate] OK: known cleanup candidates are unused by first-party code.');
