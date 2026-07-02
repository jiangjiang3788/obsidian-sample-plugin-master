#!/usr/bin/env node
/**
 * refactor-hotspots
 *
 * Produces a focused queue for the third-round V20-V25 folder ownership passes
 * from the raw refactor metrics.  It is a planning aid, not a hard architecture gate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReport, normalizePath } from './refactor-metrics.mjs';

const DEFAULT_ROOT = process.cwd();

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: DEFAULT_ROOT,
    output: null,
    markdown: null,
    json: false,
    pretty: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') options.root = path.resolve(argv[++index]);
    else if (arg === '--output') options.output = argv[++index];
    else if (arg === '--markdown') options.markdown = argv[++index];
    else if (arg === '--json') options.json = true;
    else if (arg === '--no-pretty') options.pretty = false;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/audit/refactor-hotspots.mjs [options]\n\nOptions:\n  --root <dir>        Project root. Defaults to process.cwd().\n  --output <file>     Write JSON queue to a file.\n  --markdown <file>   Write a Markdown queue to a file.\n  --json              Print JSON to stdout instead of a concise summary.\n  --no-pretty         Minify JSON output.\n`);
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function topSemanticFiles(report, id, limit = 10) {
  const category = report.semanticHotspots.find((item) => item.id === id);
  return category ? category.files.slice(0, limit) : [];
}

function pickFiles(items, limit = 12) {
  return items.slice(0, limit).map((item) => item.file);
}

function buildHotspots(report) {
  const largestFiles = report.fileHotspots.largestFiles;
  const quickInputFiles = report.semanticHotspots
    .find((item) => item.id === 'recordInputFlow')
    ?.files.filter((item) => item.file.includes('QuickInput') || item.file.includes('recordInput') || item.file.includes('InputService'))
    .slice(0, 14) ?? [];

  return {
    generatedAt: report.generatedAt,
    summary: {
      files: report.totals.files,
      lines: report.totals.lines,
      filesOver500Lines: report.fileHotspots.filesOver500Lines,
      tsxFilesOver350Lines: report.fileHotspots.tsxFilesOver350Lines,
      explicitAny: report.typeHealth.explicitAny,
      corePublicExports: report.boundary.corePublic.exports.count,
      corePublicStarExports: report.boundary.corePublic.exports.starExports,
      sharedPublicExports: report.boundary.sharedPublic.exports.count,
      sharedPublicStarExports: report.boundary.sharedPublic.exports.starExports,
      duplicateFunctionNameGroups: report.duplicateFunctionNames.length,
    },
    largeFiles: largestFiles.slice(0, 20),
    duplicateFunctionNames: report.duplicateFunctionNames.slice(0, 20),
    semanticQueues: {
      pathSemantics: topSemanticFiles(report, 'pathSemantics', 12),
      fieldValueSemantics: topSemanticFiles(report, 'fieldValueSemantics', 12),
      recordInputFlow: topSemanticFiles(report, 'recordInputFlow', 12),
      storeMutationFlow: topSemanticFiles(report, 'storeMutationFlow', 12),
      aiParsingFlow: topSemanticFiles(report, 'aiParsingFlow', 12),
      layoutGeometryFlow: topSemanticFiles(report, 'layoutGeometryFlow', 12),
    },
    boundaryQueues: {
      corePublicTopImporters: report.boundary.corePublic.imports.importers.slice(0, 20),
      sharedPublicTopImporters: report.boundary.sharedPublic.imports.importers.slice(0, 20),
      coreDeepImports: report.boundary.corePublic.deepImports.importers.slice(0, 20),
      sharedDeepImports: report.boundary.sharedPublic.deepImports.importers.slice(0, 20),
    },
    recommendedBatches: [
      {
        version: 'V20',
        focus: '构建基线 + 目录迁移地图',
        reason: '第三轮先建立 folder ownership 地图，并允许本地 data.json 作为单人运行态文件。',
        candidateFiles: ['docs/FOLDER_REORG_PLAN.md', 'scripts/audit/folder-reorg-map.mjs', 'scripts/gates/folder-reorg-plan-gate.mjs'],
      },
      {
        version: 'V21',
        focus: 'QuickInput 目录归属重排',
        reason: '快捷面板 editor 与 modal content 属于 quickinput feature，platform 只保留 Obsidian adapter。',
        candidateFiles: pickFiles(quickInputFiles, 16),
      },
      {
        version: 'V22',
        focus: 'Settings / Views 目录重排',
        reason: 'Statistics、Timeline、Excel、Heatmap 等业务视图已经离开 shared/ui/views，归入 settings/views/runtime。',
        candidateFiles: ['src/features/settings/views/runtime', 'src/features/settings/views/editors', 'src/features/settings/views/models'],
      },
      {
        version: 'V23',
        focus: 'Core 领域目录收敛 + 删除旧兼容',
        reason: 'RecordInput 已从 generic services bucket 移入 core/recordInput；任务记录和记录提交工具继续按领域归属收窄。',
        candidateFiles: ['src/core/recordInput', 'src/core/utils', 'src/core/types'],
      },
      {
        version: 'V24',
        focus: 'Shared / Platform 瘦身',
        reason: 'shared 只保留通用 UI/hooks/utils，platform 显式整理为 Obsidian adapters。',
        candidateFiles: ['src/features/settings/views/runtime', 'src/platform'],
      },
      {
        version: 'V25',
        focus: '当前 schema 锁定 + release 封版',
        reason: '不做旧数据迁移，只锁当前 schema、目录预算和 release 包边界。',
        candidateFiles: ['src/core/settings', 'scripts/gates/refactor-budget-baseline.json', 'docs/MVP_ACCEPTANCE.md'],
      },
    ],

  };
}

function markdownTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '\\|')).join(' | ')} |`);
  return [headerLine, separator, ...body].join('\n');
}

function renderMarkdown(queue) {
  const largeRows = queue.largeFiles.slice(0, 15).map((item, index) => [index + 1, item.file, item.lines, item.layer]);
  const duplicateRows = queue.duplicateFunctionNames.slice(0, 12).map((item, index) => [index + 1, item.name, item.fileCount, item.files.slice(0, 4).join('<br>')]);
  const batchRows = queue.recommendedBatches.map((item) => [item.version, item.focus, item.reason, item.candidateFiles.slice(0, 6).join('<br>')]);

  return `# Refactor Hotspots Queue\n\nGenerated: ${queue.generatedAt}\n\n## Summary\n\n${markdownTable(['Metric', 'Value'], Object.entries(queue.summary))}\n\n## Largest file queue\n\n${markdownTable(['#', 'File', 'Lines', 'Layer'], largeRows)}\n\n## Duplicate function-name queue\n\n${markdownTable(['#', 'Name', 'Files', 'Example files'], duplicateRows)}\n\n## Recommended batches\n\n${markdownTable(['Version', 'Focus', 'Reason', 'Candidate files'], batchRows)}\n`;
}

function writeOutputs(queue, options) {
  if (options.output) {
    const outputPath = path.resolve(options.root, options.output);
    ensureDirForFile(outputPath);
    fs.writeFileSync(outputPath, JSON.stringify(queue, null, options.pretty === false ? 0 : 2));
    console.log(`[refactor-hotspots] wrote ${normalizePath(path.relative(options.root, outputPath))}`);
  }

  if (options.markdown) {
    const markdownPath = path.resolve(options.root, options.markdown);
    ensureDirForFile(markdownPath);
    fs.writeFileSync(markdownPath, renderMarkdown(queue));
    console.log(`[refactor-hotspots] wrote ${normalizePath(path.relative(options.root, markdownPath))}`);
  }
}

function printSummary(queue) {
  console.log('[refactor-hotspots] prioritized refactor queue');
  console.log(`- files over 500 lines: ${queue.summary.filesOver500Lines}`);
  console.log(`- duplicate function-name groups: ${queue.summary.duplicateFunctionNameGroups}`);
  console.log(`- explicit any: ${queue.summary.explicitAny}`);
  console.log('- top large files:');
  for (const item of queue.largeFiles.slice(0, 8)) {
    console.log(`  ${String(item.lines).padStart(4, ' ')}  ${item.file}`);
  }
  console.log('- batches:');
  for (const item of queue.recommendedBatches) console.log(`  ${item.version}: ${item.focus}`);
}

const options = parseArgs();
const report = buildReport(options);
const queue = buildHotspots(report);
writeOutputs(queue, options);
if (options.json) console.log(JSON.stringify(queue, null, options.pretty === false ? 0 : 2));
else printSummary(queue);
