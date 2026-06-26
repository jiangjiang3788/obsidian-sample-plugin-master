#!/usr/bin/env node
/**
 * docs-governance-gate
 *
 * Keep the lightweight docs/ root useful for the single-user plugin.
 * Long legacy engineering pass reports live outside the active package history;
 * the active root keeps acceptance, current README, convergence records and git notes.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const docsDir = path.join(root, 'docs');

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function listFiles(relativeDir) {
  const dir = path.join(root, relativeDir);
  if (!fs.existsSync(dir)) return [];
  const results = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).replaceAll('\\\\', '/').replaceAll('\\', '/');
      if (entry.isDirectory()) walk(full);
      else results.push(rel);
    }
  }
  walk(dir);
  return results.sort();
}

const requiredDocs = [
  'docs/README.md',
  'docs/MVP_ACCEPTANCE.md',
  'docs/INITIAL_PLAN_PROGRESS.md',
  'docs/文档治理.md',
  'docs/单人版收敛总览.md',
  'docs/单人版收敛-MVP24.md',
  'docs/Git提交备注-MVP24.md',
  'docs/单人版收敛-MVP25.md',
  'docs/Git提交备注-MVP25.md',
  'docs/最终封版说明.md',
  'docs/类型治理计划.md',
  'docs/单人版收敛-MVP26.md',
  'docs/Git提交备注-MVP26.md',
  'docs/单人版收敛-MVP27.md',
  'docs/Git提交备注-MVP27.md',
  'docs/单人版收敛-MVP28.md',
  'docs/Git提交备注-MVP28.md',
  'docs/单人版收敛-MVP29.md',
  'docs/Git提交备注-MVP29.md',
  'docs/单人版收敛-MVP30.md',
  'docs/Git提交备注-MVP30.md',
  'docs/单人版收敛-MVP31.md',
  'docs/Git提交备注-MVP31.md',
  'docs/单人版收敛-MVP32.md',
  'docs/Git提交备注-MVP32.md',
];

for (const doc of requiredDocs) {
  if (!exists(doc)) failures.push(`${doc} must exist after MVP32 inline progress skill bar refinement.`);
}

const forbiddenRootDocPatterns = [
  /^docs\/DATA_REVIEW_MVP\d+\.md$/,
  /^docs\/(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)_PASS_CHANGES\.md$/,
  /^docs\/GOAL_CENTER_.*\.md$/,
  /^docs\/GOAL_CORE_.*\.md$/,
  /^docs\/THINK_OS_.*\.md$/,
  /^docs\/MVP\d+_PROGRESS\.md$/,
  /^docs\/MVP_PROGRESS\.md$/,
  /^docs\/RELEASE_READINESS_MVP\d+\.md$/,
];

const allDocsFiles = listFiles('docs');
for (const file of allDocsFiles) {
  if (file.includes('#U')) failures.push(`${file}: encoded #U filename must not return.`);
  if (forbiddenRootDocPatterns.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: legacy process report must not return to docs/ root after MVP25 governance.`);
  }
}

const rootMarkdownCount = fs.existsSync(docsDir)
  ? fs.readdirSync(docsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md')).length
  : 0;
if (rootMarkdownCount > 72) {
  failures.push(`docs/ root should stay <= 72 markdown files after MVP32 inline progress skill bar refinement; current ${rootMarkdownCount}.`);
}

if (exists('docs/README.md')) {
  const readme = read('docs/README.md');
  for (const requiredText of ['文档治理', '单人版收敛总览', '类型治理计划', '不再保留的历史过程文档']) {
    if (!readme.includes(requiredText)) failures.push(`docs/README.md must mention ${requiredText}.`);
  }
}

if (exists('docs/文档治理.md')) {
  const governance = read('docs/文档治理.md');
  for (const requiredText of ['保留', '删除', '防过度文档化', 'docs-governance:gate', 'any-budget:gate']) {
    if (!governance.includes(requiredText)) failures.push(`docs/文档治理.md must mention ${requiredText}.`);
  }
}

if (exists('package.json')) {
  const pkg = read('package.json');
  if (!pkg.includes('docs-governance:gate')) failures.push('package.json must expose docs-governance:gate.');
  if (!pkg.includes('any-budget:gate')) failures.push('package.json must expose any-budget:gate after MVP26.');
}

if (failures.length > 0) {
  console.error('\n[docs-governance-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[docs-governance-gate] ok: docs root is governed and MVP32 inline progress skill-bar docs are present');
