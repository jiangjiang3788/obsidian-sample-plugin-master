#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readArg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const ROOT = path.resolve(readArg('--root', process.cwd()));
const OUTPUT_ARG = readArg('--output');
const SRC = path.join(ROOT, 'src');

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, predicate);
    return predicate(full) ? [full] : [];
  });
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripImportRules(source) {
  return source.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])(?:\s+layer\([^)]*\))?[^;]*;/g, '');
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function topEntries(record, limit = 15) {
  return Object.entries(record)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, limit);
}

const allowedClassPrefixes = [
  'think-', 'sv-', 'tn-', 'et-', 'bv-', 'excel-', 'mod-', 'is-', 'has-',
  'theme-', 'workspace-', 'markdown-', 'metadata-', 'suggestion-', 'vertical-',
  'horizontal-', 'cm-', 'modal-', 'menu-', 'nav-', 'setting-', 'clickable-',
  'Mui', 'heatmap-', 'cell-', 'month-', 'statistics-', 'timeline-', 'daily-',
  'day-', 'progress-', 'summary-', 'task-', 'time-', 'event-', 'module-', 'tp-',
  'tag-', 'message-', 'md-', 'layout-', 'row-', 'week-', 'text-',
];

const allowedExactClasses = new Set([
  'modal', 'active', 'calendar', 'current-day', 'empty', 'grid-spacer', 'grid-view',
  'large', 'medium', 'small', 'pure-count', 'visual-content', 'empty-label-text',
  'block-language-think', 'css', 'dot',
]);

function isHostFrameworkClass(name) {
  return name.startsWith('Mui');
}

function isUnprefixedClass(name) {
  return !allowedExactClasses.has(name) && !allowedClassPrefixes.some((prefix) => name.startsWith(prefix));
}

const cssFiles = walk(SRC, (file) => file.endsWith('.css'));
const scriptFiles = walk(SRC, (file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
const perFile = {};
const classToFiles = new Map();
const uniqueClasses = new Set();
const uniqueThinkVariables = new Set();
const uniqueCssVariables = new Set();
const unprefixedClasses = new Set();
const hostFrameworkClasses = new Set();
const pluginUnprefixedClasses = new Set();

let cssLines = 0;
let cssRules = 0;
let selectors = 0;
let important = 0;
let hardcodedColors = 0;
let hardcodedColorsOutsideTokens = 0;
let cssVariableReferences = 0;
let sxOccurrences = 0;
let styleOccurrences = 0;

for (const file of cssFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const source = stripCssComments(raw);
  const rel = relative(file);
  const fileClasses = new Set();
  const fileThinkVariables = new Set();
  const fileCssVariables = new Set();

  cssLines += raw.split(/\r?\n/).length;
  const fileRules = count(source, /(^|})\s*[^@{}][^{}]*\{/gm);
  const selectorBlocks = [...source.matchAll(/(^|})\s*([^@{}][^{}]*)\{/gm)];
  const fileSelectors = selectorBlocks.reduce((total, match) => total + match[2].split(',').length, 0);
  const fileImportant = count(source, /!important\b/g);
  const fileColors = count(source, /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\([^)]*\)/gi);
  const variableReferences = [...source.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]);
  const variableDefinitions = [...source.matchAll(/(--think-[\w-]+)\s*:/g)].map((match) => match[1]);

  const selectorSource = stripImportRules(source)
    .replace(/@layer\s+[^;{]+;/g, '');
  for (const match of selectorSource.matchAll(/\.(-?[_a-zA-Z]+[\w-]*)/g)) {
    const name = match[1];
    fileClasses.add(name);
    uniqueClasses.add(name);
    if (isUnprefixedClass(name)) {
      unprefixedClasses.add(name);
      if (isHostFrameworkClass(name)) hostFrameworkClasses.add(name);
      else pluginUnprefixedClasses.add(name);
    }
  }
  for (const name of variableReferences) {
    fileCssVariables.add(name);
    uniqueCssVariables.add(name);
  }
  for (const name of variableDefinitions) {
    fileThinkVariables.add(name);
    uniqueThinkVariables.add(name);
  }
  for (const name of fileClasses) {
    const files = classToFiles.get(name) ?? new Set();
    files.add(rel);
    classToFiles.set(name, files);
  }

  cssRules += fileRules;
  selectors += fileSelectors;
  important += fileImportant;
  hardcodedColors += fileColors;
  if (!rel.startsWith('src/styles/tokens/')) hardcodedColorsOutsideTokens += fileColors;
  cssVariableReferences += variableReferences.length;
  perFile[rel] = {
    lines: raw.split(/\r?\n/).length,
    rules: fileRules,
    selectors: fileSelectors,
    classes: fileClasses.size,
    important: fileImportant,
    hardcodedColors: fileColors,
    cssVariableReferences: variableReferences.length,
    thinkVariableDefinitions: fileThinkVariables.size,
  };
}

for (const file of scriptFiles) {
  const source = fs.readFileSync(file, 'utf8');
  sxOccurrences += count(source, /\bsx\s*=\s*\{\{/g);
  styleOccurrences += count(source, /\bstyle\s*=\s*\{\{/g);
}

const duplicateClasses = [...classToFiles.entries()]
  .filter(([, files]) => files.size > 1)
  .map(([className, files]) => ({ className, files: [...files].sort() }))
  .sort((left, right) => right.files.length - left.files.length || left.className.localeCompare(right.className));

const report = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  summary: {
    cssFiles: cssFiles.length,
    cssLines,
    cssRules,
    selectors,
    uniqueClasses: uniqueClasses.size,
    unprefixedClasses: unprefixedClasses.size,
    pluginUnprefixedClasses: pluginUnprefixedClasses.size,
    hostFrameworkClasses: hostFrameworkClasses.size,
    duplicateClassesAcrossFiles: duplicateClasses.length,
    important,
    hardcodedColors,
    hardcodedColorsOutsideTokens,
    cssVariableReferences,
    uniqueCssVariables: uniqueCssVariables.size,
    thinkVariableDefinitions: uniqueThinkVariables.size,
    sxOccurrences,
    styleOccurrences,
  },
  topFilesByLines: topEntries(Object.fromEntries(Object.entries(perFile).map(([file, metrics]) => [file, metrics.lines]))),
  topFilesByImportant: topEntries(Object.fromEntries(Object.entries(perFile).map(([file, metrics]) => [file, metrics.important]))),
  topFilesByHardcodedColors: topEntries(Object.fromEntries(Object.entries(perFile).map(([file, metrics]) => [file, metrics.hardcodedColors]))),
  unprefixedClassNames: [...unprefixedClasses].sort(),
  pluginUnprefixedClassNames: [...pluginUnprefixedClasses].sort(),
  hostFrameworkClassNames: [...hostFrameworkClasses].sort(),
  duplicateClasses,
  perFile,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (OUTPUT_ARG) {
  const output = path.resolve(ROOT, OUTPUT_ARG);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serialized, 'utf8');
}
process.stdout.write(serialized);
