#!/usr/bin/env node
/**
 * refactor-hotspots
 *
 * Produces a focused queue for the second-round V14-V19 refactor passes
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
        version: 'V14',
        focus: 'QuickInput 真实深拆',
        reason: '快捷面板字段渲染和 editor model 是主交互入口，必须保持 UI 变薄、领域规则内聚。',
        candidateFiles: pickFiles(quickInputFiles, 16),
      },
      {
        version: 'V15',
        focus: 'CSS 大文件模块化',
        reason: '样式 facade 拆分后，统计、Excel、设置编辑器与视图外壳可以按领域维护。',
        candidateFiles: pickFiles(largestFiles.filter((item) => item.file.endsWith('.css')), 12),
      },
      {
        version: 'V16',
        focus: 'AI / Retrieval / GoalTemplate 编辑模型收敛',
        reason: 'AI 检索和目标预设编辑模型接近大文件阈值，适合拆成门面 + 内聚 helper。',
        candidateFiles: [
          ...pickFiles(topSemanticFiles(report, 'aiParsingFlow', 8)),
          ...pickFiles(topSemanticFiles(report, 'fieldValueSemantics', 8)).filter((file) => file.includes('GoalTemplate')),
        ],
      },
      {
        version: 'V17',
        focus: 'Public API 实际迁移',
        reason: '模块级 public facade 已建立，第一方代码应迁移出 @core/public / @shared/public 根入口。',
        candidateFiles: [
          'src/core/public.ts',
          'src/shared/public.ts',
          'scripts/gates/public-facades.config.mjs',
          'scripts/gates/arch-gate.mjs',
          'scripts/gates/refactor-budget-gate.mjs',
        ],
      },
      {
        version: 'V18',
        focus: '类型与 explicit any 收敛',
        reason: '大文件和 public 入口收敛后，应继续降低 any 预算，优先处理类型热点文件。',
        candidateFiles: pickFiles(report.typeHealth.topFiles, 16),
      },
      {
        version: 'V19',
        focus: '预算锁定 + 回归验收',
        reason: '把第二轮收敛成果固化到 gate 与文档，避免 public importers、any、大文件预算反弹。',
        candidateFiles: ['scripts/gates/refactor-budget-gate.mjs', 'docs/ARCH_REFACTOR_REPORT.md', 'docs/MVP_ACCEPTANCE.md'],
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
