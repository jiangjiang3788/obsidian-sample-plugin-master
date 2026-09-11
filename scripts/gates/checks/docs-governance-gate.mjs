#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const pkg = fs.existsSync(path.join(root, 'package.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) : {};
const required = [
  'README.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/RECORD_MODEL.md',
  'docs/TESTING_RELEASE.md',
  'docs/CSS_DESIGN_SPEC.md',
  'docs/DEVELOPMENT_GUARDRAILS.md',
  'docs/DOCUMENT_GOVERNANCE.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing current doc: ${file}`);
}
if (pkg.version) {
  for (const name of ['PLAN.md', 'IMPLEMENTATION_RESULT.md', 'TEST_REPORT.md']) {
    const file = `docs/releases/${pkg.version}/${name}`;
    if (!fs.existsSync(path.join(root, file))) failures.push(`missing current release doc: ${file}`);
  }
}
if (fs.existsSync(path.join(root, 'doc'))) failures.push('legacy doc/ directory is forbidden; merge documentation into docs/');
const looseRootDocs = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:md|txt)$/i.test(entry.name) && entry.name !== 'README.md')
  .map((entry) => entry.name);
if (looseRootDocs.length) failures.push(`documentation must live under docs/: ${looseRootDocs.join(', ')}`);
const docs = fs.existsSync(path.join(root, 'docs'))
  ? fs.readdirSync(path.join(root, 'docs'), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  : [];
if (docs.length > 8) failures.push(`active docs should stay <= 8 markdown files; current ${docs.length}`);
for (const name of docs.map((entry) => entry.name)) {
  if (/MVP\d+|SOURCE_VALIDATION|ENERGY_1_0_|Git提交备注|V\d+_NOTES|封版/.test(name)) {
    failures.push(`historical process doc must stay out of active docs/: ${name}`);
  }
}
const governance = fs.existsSync(path.join(root, 'docs/DOCUMENT_GOVERNANCE.md')) ? fs.readFileSync(path.join(root, 'docs/DOCUMENT_GOVERNANCE.md'), 'utf8') : '';
for (const text of ['当前事实', '归档', '历史']) if (!governance.includes(text)) failures.push(`docs/DOCUMENT_GOVERNANCE.md must mention ${text}`);
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
