#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'README.md',
  'AGENTS.md',
  'docs/ARCHITECTURE.md',
  'docs/RECORD_MODEL.md',
  'docs/CSS_DESIGN_SPEC.md',
  'docs/HELP_AND_COMMANDS.zh-CN.md',
  'docs/testing/TEST_COMMANDS_SIMPLE.zh-CN.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing current doc: ${file}`);
}
if (fs.existsSync(path.join(root, 'doc'))) failures.push('legacy doc/ directory is forbidden; merge documentation into docs/');
const looseRootDocs = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:md|txt)$/i.test(entry.name) && !['README.md', 'AGENTS.md'].includes(entry.name))
  .map((entry) => entry.name);
if (looseRootDocs.length) failures.push(`documentation must live under docs/: ${looseRootDocs.join(', ')}`);
const docs = fs.existsSync(path.join(root, 'docs'))
  ? fs.readdirSync(path.join(root, 'docs'), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  : [];
// Documentation quality is about discoverability and uniqueness, not an arbitrary number of files.
const duplicateContent = new Map();
for (const entry of docs) {
  const contents = fs.readFileSync(path.join(root, 'docs', entry.name), 'utf8').replace(/\s+/g, ' ').trim();
  if (duplicateContent.has(contents)) {
    failures.push(`duplicate active docs: ${duplicateContent.get(contents)} and ${entry.name}`);
  } else {
    duplicateContent.set(contents, entry.name);
  }
}
for (const name of docs.map((entry) => entry.name)) {
  if (/MVP\d+|SOURCE_VALIDATION|ENERGY_1_0_|Git提交备注|V\d+_NOTES|封版/.test(name)) {
    failures.push(`historical process doc must stay out of active docs/: ${name}`);
  }
}
const rulesPath = path.join(root, 'AGENTS.md');
const rules = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : '';
for (const keyword of ['习惯', '测试', 'Vika', '数据']) {
  if (!rules.includes(keyword)) failures.push(`AGENTS.md is missing essential subject: ${keyword}`);
}
if (fs.existsSync(path.join(root, 'demo'))) failures.push('historical demo datasets must stay outside the active source package');
for (const dir of ['reports/record-architecture-convergence', 'reports/task-data-foundation-v2']) {
  if (fs.existsSync(path.join(root, dir))) failures.push(`historical report directory must stay archived: ${dir}`);
}
if (failures.length) {
  console.error('[docs-governance] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[docs-governance] PASS (${docs.length} active markdown docs; history archived)`);
