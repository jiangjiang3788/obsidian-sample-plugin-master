#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'README.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/RECORD_MODEL.md',
  'docs/TESTING_RELEASE.md',
  'docs/CSS_DESIGN_SPEC.md',
  'docs/DEVELOPMENT_GUARDRAILS.md',
  'docs/文档治理.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing current doc: ${file}`);
}
const docs = fs.existsSync(path.join(root, 'docs'))
  ? fs.readdirSync(path.join(root, 'docs'), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  : [];
if (docs.length > 8) failures.push(`active docs should stay <= 8 markdown files; current ${docs.length}`);
for (const name of docs.map((entry) => entry.name)) {
  if (/MVP\d+|SOURCE_VALIDATION|ENERGY_1_0_|Git提交备注|V\d+_NOTES|封版/.test(name)) {
    failures.push(`historical process doc must stay out of active docs/: ${name}`);
  }
}
const governance = fs.existsSync(path.join(root, 'docs/文档治理.md')) ? fs.readFileSync(path.join(root, 'docs/文档治理.md'), 'utf8') : '';
for (const text of ['当前事实', '归档', '历史']) if (!governance.includes(text)) failures.push(`docs/文档治理.md must mention ${text}`);
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
