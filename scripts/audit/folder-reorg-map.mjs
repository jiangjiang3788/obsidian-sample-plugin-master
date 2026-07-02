#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const isMain = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);

const migrations = [
  {
    phase: 'V21',
    area: 'QuickInput editor',
    source: 'src/app/ui/components/QuickInputEditor',
    target: 'src/features/quickinput/editor',
    reason: 'QuickInput editor is feature-owned UI, not app-wide UI infrastructure.',
  },
  {
    phase: 'V21',
    area: 'QuickInput modal business UI',
    source: 'src/platform/obsidian/modals/QuickInputModalContent.tsx',
    target: 'src/features/quickinput/modal/QuickInputModalContent.tsx',
    reason: 'QuickInput modal content moved to the feature; src/platform/obsidian/modals/QuickInputModal.tsx now remains as the Obsidian adapter.',
  },
  {
    phase: 'V21',
    area: 'QuickInput modal helpers',
    source: 'src/platform/obsidian/modals/quickInputOperationMode.ts',
    target: 'src/features/quickinput/modal/quickInputOperationMode.ts',
    reason: 'Edit / convert / duplicate operation semantics belong with the quickinput feature.',
  },
  {
    phase: 'V22',
    area: 'Business runtime views',
    source: 'src/shared/ui/views',
    target: 'src/features/settings/views/runtime',
    reason: 'Statistics, timeline, excel and heatmap are business views, not shared primitives.',
  },
  {
    phase: 'V22',
    area: 'Settings view editors',
    source: 'src/features/settings/viewEditors',
    target: 'src/features/settings/views/editors',
    reason: 'View runtime, editor and model files should live under the same feature ownership.',
  },
  {
    phase: 'V22',
    area: 'Settings view models',
    source: 'src/features/settings/viewModels',
    target: 'src/features/settings/views/models',
    reason: 'View model helpers are owned by the settings views feature.',
  },
  {
    phase: 'V23',
    area: 'RecordInput core services',
    source: 'src/core/services/recordInput',
    target: 'src/core/recordInput',
    reason: 'Record input is a core domain, not a generic service bucket.',
  },
  {
    phase: 'V23',
    area: 'Core utils ownership',
    source: 'src/core/utils',
    target: 'src/core/<domain>',
    reason: 'Domain helpers should move into semantics, fields, records, settings or theme.',
  },
  {
    phase: 'V23',
    area: 'Task record helpers',
    source: 'src/core/utils/taskTime.ts',
    target: 'src/core/records/task/taskTime.ts',
    reason: 'Task time rules belong with task record helpers.',
  },
  {
    phase: 'V23',
    area: 'Record submit feedback helpers',
    source: 'src/core/utils/recordSubmitRecovery.ts',
    target: 'src/core/recordInput/recovery.ts',
    reason: 'Record submit feedback and recovery belong with the RecordInput domain.',
  },
  {
    phase: 'V24',
    area: 'Platform Obsidian adapters',
    source: 'src/platform',
    target: 'src/platform/obsidian',
    reason: 'The platform layer is currently Obsidian-specific and should say so explicitly; root files under src/platform are now forbidden.',
  },
  {
    phase: 'V24',
    area: 'Shared item renderers',
    source: 'src/shared/ui/items',
    target: 'src/features/settings/views/runtime/components/items',
    reason: 'TaskRow, BlockItem and related item renderers are business view runtime components.',
  },
  {
    phase: 'V24',
    area: 'Shared heatmap renderer',
    source: 'src/shared/ui/heatmap',
    target: 'src/features/settings/views/runtime/components/heatmap',
    reason: 'Heatmap cells are owned by settings runtime views, not shared primitives.',
  },
  {
    phase: 'V24',
    area: 'Shared statistics renderer',
    source: 'src/shared/ui/statistics',
    target: 'src/features/settings/views/runtime/components/statistics',
    reason: 'Statistics chart blocks are owned by settings runtime views.',
  },
  {
    phase: 'V24',
    area: 'Shared timeline renderer',
    source: 'src/shared/ui/timeline',
    target: 'src/features/settings/views/runtime/components/timeline',
    reason: 'Timeline day-column renderers are business view runtime components.',
  },
  {
    phase: 'V24',
    area: 'Shared Obsidian modal forwarder',
    source: 'src/shared/ui/composites/dialogs/NamePromptModal.ts',
    target: 'src/platform/obsidian/modals/NamePromptModal.tsx',
    reason: 'Obsidian Modal implementations belong to the platform adapter, not shared UI.',
  },
  {
    phase: 'V25',
    area: 'Current schema lock',
    source: 'src/core/settings',
    target: 'src/core/settings',
    reason: 'Single-user mode supports the current settings schema only; legacy migration code can be removed.',
  },
];

function normalize(filePath) {
  return filePath.replaceAll('\\\\', '/').replaceAll('\\', '/');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function countFiles(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return 0;
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return 1;
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else count += 1;
    }
  }
  walk(fullPath);
  return count;
}


function countDirectFiles(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return 0;
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return 1;
  return fs.readdirSync(fullPath, { withFileTypes: true }).filter((entry) => entry.isFile()).length;
}

function readPackageScripts() {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return Object.keys(pkg.scripts ?? {}).sort();
}

function buildReport() {
  return {
    version: 'V25-current-schema-release-lock',
    rootDataJsonPolicy: {
      secretGateBlocksRootDataJson: false,
      releasePackageIncludesRootDataJson: false,
      note: 'Root data.json is local runtime state. It is ignored by secret-gate and still excluded from release packages.',
    },
    packageScripts: readPackageScripts().filter((script) => script.startsWith('folder:')),
    platformRootDirectFileCount: countDirectFiles('src/platform'),
    migrations: migrations.map((entry) => ({
      ...entry,
      sourceExists: exists(entry.source),
      targetExists: exists(entry.target),
      sourceFileCount: countFiles(entry.source),
      targetFileCount: countFiles(entry.target),
    })),
  };
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeMarkdown(report, outputPath) {
  const lines = [
    '# Folder Reorg Map',
    '',
    `Version: ${report.version}`,
    '',
    '## Local data policy',
    '',
    `- secret-gate blocks root data.json: ${report.rootDataJsonPolicy.secretGateBlocksRootDataJson}`,
    `- release package includes root data.json: ${report.rootDataJsonPolicy.releasePackageIncludesRootDataJson}`,
    `- note: ${report.rootDataJsonPolicy.note}`,
    '',
    '## Migration candidates',
    '',
    '| Phase | Area | Source | Source files | Target | Target files | Reason |',
    '|---|---|---|---:|---|---:|---|',
    ...report.migrations.map((entry) => `| ${entry.phase} | ${entry.area} | \`${entry.source}\` | ${entry.sourceFileCount} | \`${entry.target}\` | ${entry.targetFileCount} | ${entry.reason} |`),
    '',
  ];
  ensureDirForFile(outputPath);
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = { output: null, markdown: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output') options.output = argv[++index];
    else if (arg === '--markdown') options.markdown = argv[++index];
    else if (arg === '--json') options.json = true;
  }
  return options;
}

if (isMain) {
  const options = parseArgs();
  const report = buildReport();
  if (options.output) {
    ensureDirForFile(options.output);
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.markdown) writeMarkdown(report, options.markdown);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('[folder-reorg-map] V25 current schema and release folder reorg');
    for (const entry of report.migrations) {
      console.log(`- ${entry.phase} ${entry.area}: ${entry.sourceFileCount} source files -> ${entry.target}`);
    }
  }
}

export { buildReport, migrations };
