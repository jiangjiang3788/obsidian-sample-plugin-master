#!/usr/bin/env node
/**
 * any-budget-gate
 *
 * V19 type-governance locked budget. This gate does not ban every explicit any.
 * It makes the current debt visible, separates source/test/scripts counts, and
 * keeps the V18 reduction as the V19 release floor and gives later passes a budget that must move downward over time.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const budgets = {
  src: 671,
  test: 165,
  scripts: 4,
  total: 840,
  asAny: 419,
  colonAny: 341,
};

const roots = ['src', 'test', 'scripts'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cts']);
const ignoredPathParts = new Set(['node_modules', 'dist', '.git']);

function normalizePath(filePath) {
  return filePath.replaceAll('\\\\', '/').replaceAll('\\', '/');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = normalizePath(path.relative(root, full));
    if ([...ignoredPathParts].some((part) => rel.split('/').includes(part))) continue;
    if (entry.isDirectory()) results.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) results.push(rel);
  }
  return results;
}

function stripCommentsAndStrings(source) {
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

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function bucketForFile(file) {
  if (file.startsWith('src/')) return 'src';
  if (file.startsWith('test/')) return 'test';
  if (file.startsWith('scripts/')) return 'scripts';
  return 'other';
}

const files = roots.flatMap((dir) => walk(path.join(root, dir))).sort();
const counts = {
  src: 0,
  test: 0,
  scripts: 0,
  total: 0,
  asAny: 0,
  colonAny: 0,
};
const perFile = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const code = stripCommentsAndStrings(text);
  const explicitAny = countMatches(code, /\bany\b/g);
  if (explicitAny === 0) continue;
  const asAny = countMatches(code, /\bas\s+any\b/g);
  const colonAny = countMatches(code, /:\s*any\b/g);
  const bucket = bucketForFile(file);
  if (bucket in counts) counts[bucket] += explicitAny;
  counts.total += explicitAny;
  counts.asAny += asAny;
  counts.colonAny += colonAny;
  perFile.push({ file, explicitAny, asAny, colonAny });
}

for (const [key, budget] of Object.entries(budgets)) {
  if (counts[key] > budget) failures.push(`${key} explicit any budget exceeded: ${counts[key]} > ${budget}`);
}

const topFiles = perFile
  .sort((a, b) => b.explicitAny - a.explicitAny || a.file.localeCompare(b.file))
  .slice(0, 12);

console.log('[any-budget-gate] explicit any budget');
console.log(`- src: ${counts.src}/${budgets.src}`);
console.log(`- test: ${counts.test}/${budgets.test}`);
console.log(`- scripts: ${counts.scripts}/${budgets.scripts}`);
console.log(`- total: ${counts.total}/${budgets.total}`);
console.log(`- as any: ${counts.asAny}/${budgets.asAny}`);
console.log(`- : any: ${counts.colonAny}/${budgets.colonAny}`);
console.log('- top files:');
for (const item of topFiles) {
  console.log(`  ${item.explicitAny.toString().padStart(4, ' ')}  ${item.file}`);
}

if (failures.length > 0) {
  console.error('\n[any-budget-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[any-budget-gate] ok: explicit any is budgeted and visible.');
