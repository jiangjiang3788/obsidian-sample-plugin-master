#!/usr/bin/env node
/**
 * refactor-metrics
 *
 * Lightweight, dependency-free refactor baseline for the Think OS source tree.
 * The script is intentionally heuristic: it does not replace TypeScript AST
 * analysis, but it makes the main refactor debts visible and repeatable before
 * the V8-V13 architecture passes start moving code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_PUBLIC_FACADES, SHARED_PUBLIC_FACADES } from '../gates/public-facades.config.mjs';

const __filename = fileURLToPath(import.meta.url);

const DEFAULT_ROOT = process.cwd();
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cts', '.css']);
const TS_LIKE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cts']);
const IGNORED_PATH_PARTS = new Set(['node_modules', 'dist', '.git', 'coverage', 'reports', 'release']);

const SEMANTIC_CATEGORIES = [
  {
    id: 'pathSemantics',
    label: '路径 / 层级语义',
    description: 'normalize/split/leaf/parent/pathCandidates/themePath/goalPath 等逻辑散落情况。',
    pattern: /\b(normalize(?:Theme|Goal|File)?Path|split(?:Theme|Goal)?Path|joinPath|get(?:Leaf|Parent).*Path|themePath|goalPath|folderPath|pathCandidates|pathSemantic|HierarchyPath|hierarchyPath)\b/g,
  },
  {
    id: 'fieldValueSemantics',
    label: '字段值 / 选项语义',
    description: '字段值、option label/value、字段来源、默认值注水等逻辑散落情况。',
    pattern: /\b(FieldValue|fieldValue|normalizeField|readOptionText|optionLabel|optionValue|isOptionLike|hydrateDefaults|fieldSources|fieldSource|TemplateFieldAdapter|FieldBehavior|defaultValue)\b/g,
  },
  {
    id: 'recordInputFlow',
    label: '记录输入 / 提交流程',
    description: 'QuickInput、RecordInput、OutputPlanner、InputService、转换/另存等流程密度。',
    pattern: /\b(QuickInput|quickInput|RecordInput|recordInput|OutputPlanner|outputPlan|InputService|submitRecord|submitUpdateRecord|TemplateSubmit|templateSubmit|planGuard|RecordInputSession|PreparedRecord|createRecord|updateRecord|Duplicate|Convert|duplicate|convert)\b/g,
  },
  {
    id: 'storeMutationFlow',
    label: 'Store / Settings 写入流程',
    description: 'Zustand set/get、SettingsRepository、load/save/update 等写入逻辑密度。',
    pattern: /\b(setState|getState|SettingsRepository|updateSettings|persistSettings|loadSettings|saveSettings|layout\.slice|theme\.slice|settings\.slice)\b/g,
  },
  {
    id: 'aiParsingFlow',
    label: 'AI 解析 / 检索流程',
    description: 'AI 自然语言解析、prompt、batch JSON、retrieval、命令归一化等逻辑密度。',
    pattern: /\b(AiNaturalLanguageRecordParser|parseNaturalLanguage|prompt|retrieval|normalizeCommand|batch|JSON\.parse|AiInput|AiChat)\b/g,
  },
  {
    id: 'layoutGeometryFlow',
    label: '布局 / 浮窗几何流程',
    description: 'freeform、FloatingPanel、drag、resize、placement、zIndex、viewport 等逻辑密度。',
    pattern: /\b(freeform|FloatingPanel|resize|drag|placement|zIndex|viewport|geometry|layoutBounds|LayoutEditor)\b/g,
  },
];

export function normalizePath(filePath) {
  return filePath.replaceAll('\\\\', '/').replaceAll('\\', '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

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
  console.log(`Usage: node scripts/audit/refactor-metrics.mjs [options]\n\nOptions:\n  --root <dir>        Project root. Defaults to process.cwd().\n  --output <file>     Write JSON report to a file.\n  --markdown <file>   Write a Markdown summary to a file.\n  --json              Print JSON to stdout instead of a concise summary.\n  --no-pretty         Minify JSON output.\n`);
}

function walk(root, relativeDir) {
  const dir = path.join(root, relativeDir);
  if (!fs.existsSync(dir)) return [];

  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = normalizePath(path.relative(root, fullPath));
    const pathParts = relativePath.split('/');
    if (pathParts.some((part) => IGNORED_PATH_PARTS.has(part))) continue;

    if (entry.isDirectory()) {
      results.push(...walk(root, relativePath));
      continue;
    }

    if (CODE_EXTENSIONS.has(path.extname(entry.name))) results.push(relativePath);
  }

  return results;
}

export function stripCommentsAndStrings(source) {
  let output = '';
  let state = 'code';

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'lineComment') {
      if (char === '\n') {
        state = 'code';
        output += '\n';
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (state === 'singleQuote' || state === 'doubleQuote' || state === 'template') {
      const closing = state === 'singleQuote' ? "'" : state === 'doubleQuote' ? '"' : '`';
      if (char === '\\') {
        output += '  ';
        index += 1;
      } else if (char === closing) {
        output += ' ';
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'lineComment';
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'blockComment';
      continue;
    }
    if (char === "'") {
      output += ' ';
      state = 'singleQuote';
      continue;
    }
    if (char === '"') {
      output += ' ';
      state = 'doubleQuote';
      continue;
    }
    if (char === '`') {
      output += ' ';
      state = 'template';
      continue;
    }
    output += char;
  }

  return output;
}

function stripCommentsOnly(source) {
  let output = '';
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === 'lineComment') {
      if (char === '\n') {
        state = 'code';
        output += '\n';
      } else {
        output += ' ';
      }
      continue;
    }
    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'lineComment';
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'blockComment';
      continue;
    }
    output += char;
  }
  return output;
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

function getLayer(file) {
  const parts = file.split('/');
  if (parts[0] !== 'src') return parts[0] ?? 'unknown';
  return parts[1] ?? 'src';
}

function top(items, limit, sorter) {
  return [...items].sort(sorter).slice(0, limit);
}

function extractImportSources(code) {
  const sources = [];
  const importPattern = /\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of code.matchAll(importPattern)) sources.push(match[1] ?? match[2]);
  return sources;
}

function extractFunctionNames(code) {
  const names = [];
  const patterns = [
    /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(?:async\s*)?function\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) names.push(match[1]);
  }
  return names;
}

function extractNamedExports(source) {
  const names = new Set();
  const exportBlockPattern = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?\s*;/g;
  for (const match of source.matchAll(exportBlockPattern)) {
    const block = match[1]
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');
    for (const part of block.split(',')) {
      const cleaned = part.trim();
      if (!cleaned) continue;
      const publicName = cleaned
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (publicName) names.add(publicName);
    }
  }

  const declarationPattern = /export\s+(?:declare\s+)?(?:abstract\s+)?(?:type|interface|class|function|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declarationPattern)) names.add(match[1]);

  const defaultCount = countMatches(source, /export\s+default\b/g);
  if (defaultCount > 0) names.add('default');

  const starExports = countMatches(source, /export\s+\*\s+from\s+['"][^'"]+['"]/g);
  return { count: names.size, names: [...names].sort(), starExports };
}

function countPublicImporters(files, fileTexts, specifier) {
  const exact = new RegExp(`\\bfrom\\s+['"]${escapeRegExp(specifier)}['"]|\\bimport\\s*\\(\\s*['"]${escapeRegExp(specifier)}['"]\\s*\\)`, 'g');
  const importers = [];
  let totalImports = 0;
  for (const file of files) {
    const ext = path.extname(file);
    if (!TS_LIKE_EXTENSIONS.has(ext)) continue;
    const text = fileTexts.get(file) ?? '';
    const matches = countMatches(text, exact);
    if (matches > 0) {
      totalImports += matches;
      importers.push({ file, imports: matches, layer: getLayer(file) });
    }
  }
  return {
    totalImports,
    importers: importers.sort((a, b) => b.imports - a.imports || a.file.localeCompare(b.file)),
  };
}

function countDeepImports(files, fileTexts, alias, allowedPublicSpecifiers) {
  const internalPrefix = alias === '@core' ? 'src/core/' : alias === '@shared' ? 'src/shared/' : null;
  const allowed = new Set(Array.isArray(allowedPublicSpecifiers) ? allowedPublicSpecifiers : [allowedPublicSpecifiers]);
  const importers = [];
  let totalImports = 0;
  for (const file of files) {
    const ext = path.extname(file);
    if (!TS_LIKE_EXTENSIONS.has(ext)) continue;
    if (internalPrefix && file.startsWith(internalPrefix)) continue;
    const code = stripCommentsOnly(fileTexts.get(file) ?? '');
    const sources = extractImportSources(code);
    const deepSources = sources.filter((source) => source.startsWith(`${alias}/`) && !allowed.has(source));
    if (deepSources.length > 0) {
      totalImports += deepSources.length;
      importers.push({ file, imports: deepSources.length, sources: [...new Set(deepSources)].sort(), layer: getLayer(file) });
    }
  }
  return {
    totalImports,
    importers: importers.sort((a, b) => b.imports - a.imports || a.file.localeCompare(b.file)),
  };
}

function collectPublicFacades(root, files, fileTexts, facades) {
  return facades.map((facade) => {
    const source = readIfExists(root, facade.file);
    return {
      ...facade,
      exists: source.length > 0,
      exports: extractNamedExports(source),
      imports: countPublicImporters(files, fileTexts, facade.specifier),
    };
  });
}

function summarizeByLayer(fileStats) {
  const byLayer = new Map();
  for (const stat of fileStats) {
    if (!byLayer.has(stat.layer)) {
      byLayer.set(stat.layer, {
        layer: stat.layer,
        files: 0,
        lines: 0,
        tsLikeFiles: 0,
        tsLikeLines: 0,
        cssFiles: 0,
        cssLines: 0,
      });
    }
    const item = byLayer.get(stat.layer);
    item.files += 1;
    item.lines += stat.lines;
    if (TS_LIKE_EXTENSIONS.has(stat.ext)) {
      item.tsLikeFiles += 1;
      item.tsLikeLines += stat.lines;
    }
    if (stat.ext === '.css') {
      item.cssFiles += 1;
      item.cssLines += stat.lines;
    }
  }
  return [...byLayer.values()].sort((a, b) => b.lines - a.lines || a.layer.localeCompare(b.layer));
}

function collectSemanticHotspots(fileStats, fileTexts) {
  return SEMANTIC_CATEGORIES.map((category) => {
    const files = [];
    let totalMatches = 0;
    for (const stat of fileStats) {
      const rawText = fileTexts.get(stat.file) ?? '';
      const text = TS_LIKE_EXTENSIONS.has(stat.ext) ? stripCommentsAndStrings(rawText) : rawText;
      const matches = countMatches(text, category.pattern);
      if (matches === 0) continue;
      totalMatches += matches;
      files.push({ file: stat.file, matches, lines: stat.lines, layer: stat.layer });
    }
    return {
      id: category.id,
      label: category.label,
      description: category.description,
      totalMatches,
      files: files.sort((a, b) => b.matches - a.matches || b.lines - a.lines || a.file.localeCompare(b.file)).slice(0, 20),
    };
  }).sort((a, b) => b.totalMatches - a.totalMatches);
}

function collectDuplicateFunctions(functionIndex) {
  const duplicates = [];
  for (const [name, files] of functionIndex.entries()) {
    const uniqueFiles = [...new Set(files)].sort();
    if (uniqueFiles.length < 2) continue;
    duplicates.push({ name, files: uniqueFiles, fileCount: uniqueFiles.length, totalDeclarations: files.length });
  }
  return duplicates.sort((a, b) => b.fileCount - a.fileCount || b.totalDeclarations - a.totalDeclarations || a.name.localeCompare(b.name)).slice(0, 50);
}

function collectTypeHealth(fileStats, fileTexts) {
  const topFiles = [];
  const totals = {
    explicitAny: 0,
    asAny: 0,
    colonAny: 0,
    tsIgnore: 0,
    tsNoCheckFiles: 0,
  };

  for (const stat of fileStats) {
    if (!TS_LIKE_EXTENSIONS.has(stat.ext)) continue;
    const rawText = fileTexts.get(stat.file) ?? '';
    const code = stripCommentsAndStrings(rawText);
    const explicitAny = countMatches(code, /\bany\b/g);
    const asAny = countMatches(code, /\bas\s+any\b/g);
    const colonAny = countMatches(code, /:\s*any\b/g);
    const tsIgnore = countMatches(rawText, /@ts-ignore\b/g);
    const tsNoCheck = /@ts-nocheck\b/.test(rawText) ? 1 : 0;

    totals.explicitAny += explicitAny;
    totals.asAny += asAny;
    totals.colonAny += colonAny;
    totals.tsIgnore += tsIgnore;
    totals.tsNoCheckFiles += tsNoCheck;

    if (explicitAny > 0 || tsIgnore > 0 || tsNoCheck > 0) {
      topFiles.push({ file: stat.file, explicitAny, asAny, colonAny, tsIgnore, tsNoCheck: Boolean(tsNoCheck), lines: stat.lines, layer: stat.layer });
    }
  }

  return {
    ...totals,
    topFiles: topFiles.sort((a, b) => b.explicitAny - a.explicitAny || b.tsIgnore - a.tsIgnore || a.file.localeCompare(b.file)).slice(0, 20),
  };
}

function readIfExists(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

export function buildReport(options = {}) {
  const root = path.resolve(options.root ?? DEFAULT_ROOT);
  const files = walk(root, 'src').sort();
  const fileTexts = new Map();
  const fileStats = [];
  const functionIndex = new Map();

  for (const file of files) {
    const fullPath = path.join(root, file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(file);
    const layer = getLayer(file);
    const lines = lineCount(text);
    const rawCode = TS_LIKE_EXTENSIONS.has(ext) ? stripCommentsAndStrings(text) : text;
    const imports = TS_LIKE_EXTENSIONS.has(ext) ? extractImportSources(stripCommentsOnly(text)) : [];
    const functionNames = TS_LIKE_EXTENSIONS.has(ext) ? extractFunctionNames(rawCode) : [];
    const hooks = TS_LIKE_EXTENSIONS.has(ext) ? countMatches(rawCode, /\buse(?:State|Effect|Memo|Callback|Ref|Reducer)\s*\(/g) : 0;
    const jsxElements = ext === '.tsx' || ext === '.jsx' ? countMatches(text, /<[A-Z][A-Za-z0-9_.]*\b/g) : 0;
    const exportedDeclarations = TS_LIKE_EXTENSIONS.has(ext) ? countMatches(rawCode, /\bexport\s+(?:type|interface|class|function|const|let|var|enum)\b/g) : 0;

    fileTexts.set(file, text);
    for (const name of functionNames) {
      if (!functionIndex.has(name)) functionIndex.set(name, []);
      functionIndex.get(name).push(file);
    }

    fileStats.push({
      file,
      ext,
      layer,
      lines,
      imports: imports.length,
      importedSources: [...new Set(imports)].sort(),
      functionLikeDeclarations: functionNames.length,
      hooks,
      jsxElements,
      exportedDeclarations,
    });
  }

  const byLayer = summarizeByLayer(fileStats);
  const totals = {
    files: fileStats.length,
    lines: fileStats.reduce((sum, stat) => sum + stat.lines, 0),
    tsLikeFiles: fileStats.filter((stat) => TS_LIKE_EXTENSIONS.has(stat.ext)).length,
    tsLikeLines: fileStats.filter((stat) => TS_LIKE_EXTENSIONS.has(stat.ext)).reduce((sum, stat) => sum + stat.lines, 0),
    cssFiles: fileStats.filter((stat) => stat.ext === '.css').length,
    cssLines: fileStats.filter((stat) => stat.ext === '.css').reduce((sum, stat) => sum + stat.lines, 0),
  };

  const largeFiles = top(fileStats, 40, (a, b) => b.lines - a.lines || a.file.localeCompare(b.file));
  const largeFileCandidates = fileStats
    .filter((stat) => stat.lines >= 450 || (stat.ext === '.tsx' && stat.lines >= 350))
    .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));

  const corePublicSource = readIfExists(root, 'src/core/public.ts');
  const sharedPublicSource = readIfExists(root, 'src/shared/public.ts');
  const corePublicExports = extractNamedExports(corePublicSource);
  const sharedPublicExports = extractNamedExports(sharedPublicSource);

  return {
    generatedAt: new Date().toISOString(),
    root: normalizePath(root),
    scope: 'src/**/*.{ts,tsx,js,jsx,mjs,mts,cts,css}',
    totals,
    byLayer,
    fileHotspots: {
      largestFiles: largeFiles,
      largeFileCandidates,
      filesOver500Lines: fileStats.filter((stat) => stat.lines >= 500).length,
      nonCssFilesOver500Lines: fileStats.filter((stat) => stat.ext !== '.css' && stat.lines >= 500).length,
      tsLikeFilesOver450Lines: fileStats.filter((stat) => TS_LIKE_EXTENSIONS.has(stat.ext) && stat.lines >= 450).length,
      tsxFilesOver350Lines: fileStats.filter((stat) => stat.ext === '.tsx' && stat.lines >= 350).length,
    },
    typeHealth: collectTypeHealth(fileStats, fileTexts),
    boundary: {
      corePublic: {
        exports: corePublicExports,
        imports: countPublicImporters(files, fileTexts, '@core/public'),
        deepImports: countDeepImports(files, fileTexts, '@core', CORE_PUBLIC_FACADES.map((facade) => facade.specifier)),
      },
      sharedPublic: {
        exports: sharedPublicExports,
        imports: countPublicImporters(files, fileTexts, '@shared/public'),
        deepImports: countDeepImports(files, fileTexts, '@shared', SHARED_PUBLIC_FACADES.map((facade) => facade.specifier)),
      },
      corePublicFacades: collectPublicFacades(root, files, fileTexts, CORE_PUBLIC_FACADES),
      sharedPublicFacades: collectPublicFacades(root, files, fileTexts, SHARED_PUBLIC_FACADES),
    },
    semanticHotspots: collectSemanticHotspots(fileStats, fileTexts),
    duplicateFunctionNames: collectDuplicateFunctions(functionIndex),
  };
}

function markdownTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '\\|')).join(' | ')} |`);
  return [headerLine, separator, ...body].join('\n');
}

export function renderMarkdown(report) {
  const largestRows = report.fileHotspots.largestFiles.slice(0, 15).map((item, index) => [index + 1, item.file, item.lines, item.layer, item.functionLikeDeclarations, item.hooks]);
  const layerRows = report.byLayer.map((item) => [item.layer, item.files, item.lines, item.tsLikeLines, item.cssLines]);
  const anyRows = report.typeHealth.topFiles.slice(0, 12).map((item, index) => [index + 1, item.file, item.explicitAny, item.asAny, item.colonAny, item.tsIgnore]);
  const semanticRows = report.semanticHotspots.map((item) => [item.label, item.totalMatches, item.files.slice(0, 3).map((file) => `${file.file} (${file.matches})`).join('<br>')]);
  const duplicateRows = report.duplicateFunctionNames.slice(0, 12).map((item, index) => [index + 1, item.name, item.fileCount, item.files.slice(0, 5).join('<br>')]);
  const modulePublicRows = [
    ...report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module').map((facade) => [facade.specifier, facade.file, facade.exists ? 'yes' : 'no', facade.imports.totalImports, facade.imports.importers.length]),
    ...report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module').map((facade) => [facade.specifier, facade.file, facade.exists ? 'yes' : 'no', facade.imports.totalImports, facade.imports.importers.length]),
  ];

  return `# Refactor Metrics Snapshot

Generated: ${report.generatedAt}

## Totals

${markdownTable(['Metric', 'Value'], [
    ['Files', report.totals.files],
    ['Lines', report.totals.lines],
    ['TS-like files', report.totals.tsLikeFiles],
    ['TS-like lines', report.totals.tsLikeLines],
    ['CSS files', report.totals.cssFiles],
    ['CSS lines', report.totals.cssLines],
    ['Files >= 500 lines', report.fileHotspots.filesOver500Lines],
    ['Non-CSS files >= 500 lines', report.fileHotspots.nonCssFilesOver500Lines],
    ['TS-like files >= 450 lines', report.fileHotspots.tsLikeFilesOver450Lines],
    ['TSX files >= 350 lines', report.fileHotspots.tsxFilesOver350Lines],
    ['Explicit any', report.typeHealth.explicitAny],
    ['core/public exports', report.boundary.corePublic.exports.count],
    ['shared/public exports', report.boundary.sharedPublic.exports.count],
  ])}

## Lines by layer

${markdownTable(['Layer', 'Files', 'Lines', 'TS-like lines', 'CSS lines'], layerRows)}

## Largest files

${markdownTable(['#', 'File', 'Lines', 'Layer', 'Function-like declarations', 'Hooks'], largestRows)}

## Explicit any hotspots

${markdownTable(['#', 'File', 'any', 'as any', ': any', '@ts-ignore'], anyRows)}

## Semantic hotspots

${markdownTable(['Category', 'Matches', 'Top files'], semanticRows)}

## Duplicate function-name groups

${markdownTable(['#', 'Name', 'Files', 'Example files'], duplicateRows)}

## Public API surface

${markdownTable(['Surface', 'Exports', 'Import statements', 'Importing files', 'Deep imports'], [
    ['@core/public', `${report.boundary.corePublic.exports.count} + ${report.boundary.corePublic.exports.starExports} export*`, report.boundary.corePublic.imports.totalImports, report.boundary.corePublic.imports.importers.length, report.boundary.corePublic.deepImports.totalImports],
    ['@shared/public', `${report.boundary.sharedPublic.exports.count} + ${report.boundary.sharedPublic.exports.starExports} export*`, report.boundary.sharedPublic.imports.totalImports, report.boundary.sharedPublic.imports.importers.length, report.boundary.sharedPublic.deepImports.totalImports],
  ])}

## Module public facades

${markdownTable(['Surface', 'File', 'Exists', 'Import statements', 'Importing files'], modulePublicRows)}
`;
}

function printSummary(report) {
  console.log('[refactor-metrics] source refactor baseline');
  console.log(`- files: ${report.totals.files}`);
  console.log(`- lines: ${report.totals.lines}`);
  console.log(`- TS-like lines: ${report.totals.tsLikeLines}`);
  console.log(`- CSS lines: ${report.totals.cssLines}`);
  console.log(`- files >= 500 lines: ${report.fileHotspots.filesOver500Lines}`);
  console.log(`- non-CSS files >= 500 lines: ${report.fileHotspots.nonCssFilesOver500Lines}`);
  console.log(`- TS-like files >= 450 lines: ${report.fileHotspots.tsLikeFilesOver450Lines}`);
  console.log(`- TSX files >= 350 lines: ${report.fileHotspots.tsxFilesOver350Lines}`);
  console.log(`- explicit any: ${report.typeHealth.explicitAny}`);
  console.log(`- @core/public named exports/export*/importers: ${report.boundary.corePublic.exports.count}/${report.boundary.corePublic.exports.starExports}/${report.boundary.corePublic.imports.importers.length}`);
  console.log(`- @shared/public named exports/export*/importers: ${report.boundary.sharedPublic.exports.count}/${report.boundary.sharedPublic.exports.starExports}/${report.boundary.sharedPublic.imports.importers.length}`);
  console.log(`- module public facades: core ${report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/${report.boundary.corePublicFacades.filter((facade) => facade.scope === 'module').length}, shared ${report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module' && facade.exists).length}/${report.boundary.sharedPublicFacades.filter((facade) => facade.scope === 'module').length}`);
  console.log('- largest files:');
  for (const item of report.fileHotspots.largestFiles.slice(0, 8)) {
    console.log(`  ${String(item.lines).padStart(4, ' ')}  ${item.file}`);
  }
  console.log('- semantic hotspots:');
  for (const item of report.semanticHotspots) {
    const topFile = item.files[0] ? `${item.files[0].file} (${item.files[0].matches})` : 'none';
    console.log(`  ${String(item.totalMatches).padStart(4, ' ')}  ${item.label}: ${topFile}`);
  }
}

export function writeReportOutputs(report, options = {}) {
  if (options.output) {
    const outputPath = path.resolve(options.root ?? DEFAULT_ROOT, options.output);
    ensureDirForFile(outputPath);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, options.pretty === false ? 0 : 2));
    console.log(`[refactor-metrics] wrote ${normalizePath(path.relative(options.root ?? DEFAULT_ROOT, outputPath))}`);
  }

  if (options.markdown) {
    const markdownPath = path.resolve(options.root ?? DEFAULT_ROOT, options.markdown);
    ensureDirForFile(markdownPath);
    fs.writeFileSync(markdownPath, renderMarkdown(report));
    console.log(`[refactor-metrics] wrote ${normalizePath(path.relative(options.root ?? DEFAULT_ROOT, markdownPath))}`);
  }
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === __filename;
}

if (isMainModule()) {
  const options = parseArgs();
  const report = buildReport(options);
  writeReportOutputs(report, options);
  if (options.json) console.log(JSON.stringify(report, null, options.pretty === false ? 0 : 2));
  else printSummary(report);
}
