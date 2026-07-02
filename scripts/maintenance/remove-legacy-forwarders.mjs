#!/usr/bin/env node
// Safely removes known legacy wrapper/forwarder files after checking that
// first-party code no longer imports them.
//
// Usage:
//   node scripts/maintenance/remove-legacy-forwarders.mjs          # dry run
//   node scripts/maintenance/remove-legacy-forwarders.mjs --write  # delete files
//
// This script is intentionally conservative. It refuses to delete when it finds
// first-party imports that still depend on any target file.

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const help = args.has('--help') || args.has('-h');

if (help) {
  console.log(`Usage:\n  node scripts/maintenance/remove-legacy-forwarders.mjs          # dry run\n  node scripts/maintenance/remove-legacy-forwarders.mjs --write  # delete files`);
  process.exit(0);
}

const sourceExt = /\.(ts|tsx|js|jsx)$/;
const scanRoots = ['src', 'test'];

const ignoredFiles = new Set([
  'src/features/settings/views/runtime/TimelineView.tsx',
  'src/features/settings/views/runtime/EventTimelineView.tsx',
  'src/features/settings/views/runtime/StatisticsView.tsx',
  'src/features/settings/views/runtime/index.ts',
  'src/core/utils/themeUtils.ts',
  'src/core/utils/index.ts',
  'src/features/progression/types.ts',
  'src/features/progression/computeProgression.ts',
  'src/features/settings/SettingsTab.tsx',
  'src/features/quickinput/QuickInputModal.tsx',
]);

const targets = [
  {
    name: 'legacy TimelineView forwarder',
    file: 'src/features/settings/views/runtime/TimelineView.tsx',
    importPatterns: [
      /from\s+['"](?:@shared\/ui\/views\/TimelineView|@\/shared\/ui\/views\/TimelineView)['"]/, 
      /from\s+['"](?:\.\/TimelineView|\.\.\/views\/TimelineView)['"]/, 
    ],
  },
  {
    name: 'legacy EventTimelineView forwarder',
    file: 'src/features/settings/views/runtime/EventTimelineView.tsx',
    importPatterns: [
      /from\s+['"](?:@shared\/ui\/views\/EventTimelineView|@\/shared\/ui\/views\/EventTimelineView)['"]/, 
      /from\s+['"](?:\.\/EventTimelineView|\.\.\/views\/EventTimelineView)['"]/, 
    ],
  },
  {
    name: 'legacy StatisticsView forwarder',
    file: 'src/features/settings/views/runtime/StatisticsView.tsx',
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

function findFailures(files) {
  const failures = [];

  for (const target of targets) {
    const targetAbs = path.join(root, target.file);
    if (!fs.existsSync(targetAbs)) continue;

    for (const publicExport of target.forbiddenPublicExports ?? []) {
      const file = path.join(root, publicExport.file);
      if (!fs.existsSync(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (publicExport.pattern.test(source)) {
        failures.push(`${publicExport.file}: still publicly exports ${target.name}`);
      }
    }

    for (const file of files) {
      const fileRel = rel(file);
      if (ignoredFiles.has(fileRel)) continue;
      const source = fs.readFileSync(file, 'utf8');
      source.split(/\r?\n/).forEach((line, index) => {
        if (target.importPatterns.some((pattern) => pattern.test(line))) {
          failures.push(`${fileRel}:${index + 1}: imports ${target.name}: ${line.trim()}`);
        }
      });
    }
  }

  return failures;
}

const files = scanRoots.flatMap((scanRoot) => walk(path.join(root, scanRoot)));
const failures = findFailures(files);

if (failures.length) {
  console.error('Refusing to remove legacy forwarders because references still exist:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const existingTargets = targets.filter((target) => fs.existsSync(path.join(root, target.file)));

if (!existingTargets.length) {
  console.log('No legacy forwarder files remain. Nothing to remove.');
  process.exit(0);
}

console.log(write ? 'Removing legacy forwarder files:' : 'Dry run: legacy forwarder files ready to remove:');
for (const target of existingTargets) {
  console.log(`- ${target.file} (${target.name})`);
}

if (!write) {
  console.log('\nRun with --write to delete these files.');
  process.exit(0);
}

for (const target of existingTargets) {
  fs.unlinkSync(path.join(root, target.file));
}

console.log('\nRemoved legacy forwarder files. Recommended follow-up:');
console.log('- npm run legacy-forwarder-usage:gate');
console.log('- npm run unused-export-candidates:gate');
console.log('- npm run build');
