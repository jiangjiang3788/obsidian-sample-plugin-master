#!/usr/bin/env node
/**
 * final-convergence-gate
 *
 * MVP25 final guard for the single-user convergence package.  This gate does
 * not add new architectural policy; it verifies that the code, view, document
 * and final handoff gates are wired together and that the final docs describe
 * the current maintenance boundary.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function full(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(full(relativePath), 'utf8');
}

function listFiles(relativeDir) {
  const dir = full(relativeDir);
  if (!fs.existsSync(dir)) return [];
  const result = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      const relativePath = path.relative(root, entryPath).replaceAll('\\\\', '/').replaceAll('\\', '/');
      if (entry.isDirectory()) walk(entryPath);
      else result.push(relativePath);
    }
  }
  walk(dir);
  return result.sort();
}

function assertExists(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath} is required: ${reason}`);
}

function assertIncludes(relativePath, snippets, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath} is missing while checking ${reason}`);
    return;
  }
  const text = read(relativePath);
  for (const snippet of snippets) {
    if (!text.includes(snippet)) failures.push(`${relativePath} must mention ${snippet} (${reason}).`);
  }
}

const requiredFinalDocs = [
  ['docs/README.md', 'active docs entrypoint'],
  ['docs/MVP_ACCEPTANCE.md', 'release acceptance checklist'],
  ['docs/文档治理.md', 'document governance boundary'],
  ['docs/单人版收敛总览.md', 'convergence overview'],
  ['docs/最终封版说明.md', 'final handoff summary'],
  ['docs/单人版收敛-MVP25.md', 'MVP25 final record'],
  ['docs/Git提交备注-MVP25.md', 'MVP25 reusable commit note'],
];

for (const [relativePath, reason] of requiredFinalDocs) assertExists(relativePath, reason);

assertIncludes('docs/README.md', ['最终封版说明', 'MVP25', 'docs-governance:gate'], 'final docs entrypoint should point to handoff and gates');
assertIncludes('docs/单人版收敛总览.md', ['MVP25', '最终封版', '不再继续拆'], 'overview should describe final convergence boundary');
assertIncludes('docs/最终封版说明.md', ['最终质量入口', '不再强拆', '完整本地验证'], 'final handoff should be actionable');
assertIncludes('docs/MVP_ACCEPTANCE.md', ['single-user convergence', 'final-convergence:gate', 'docs-governance:gate'], 'acceptance should include convergence gates');

const allProjectFiles = listFiles('.');
for (const file of allProjectFiles) {
  if (file.includes('#U')) failures.push(`${file}: encoded #U filename must not return in the final package.`);
}

const docsRootMarkdownCount = fs.existsSync(full('docs'))
  ? fs.readdirSync(full('docs'), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md')).length
  : 0;
if (docsRootMarkdownCount > 58) failures.push(`docs/ root should stay <= 58 markdown files in the final package; current ${docsRootMarkdownCount}.`);

const requiredGateScripts = [
  ['single-user:gate', 'single-user convergence gate'],
  ['shared-view-convergence:gate', 'shared view convergence gate'],
  ['non-shared-view-convergence:gate', 'non-shared view convergence gate'],
  ['docs-governance:gate', 'docs governance gate'],
  ['final-convergence:gate', 'final convergence handoff gate'],
];

if (exists('package.json')) {
  const pkg = JSON.parse(read('package.json'));
  for (const [scriptName, reason] of requiredGateScripts) {
    if (!pkg.scripts?.[scriptName]) failures.push(`package.json must expose ${scriptName} (${reason}).`);
    if (!pkg.scripts?.gate?.includes(`npm run ${scriptName}`)) failures.push(`npm run gate must include ${scriptName} (${reason}).`);
  }
}

const requiredGateFiles = [
  'scripts/gates/single-user-convergence-gate.mjs',
  'scripts/gates/shared-view-convergence-gate.mjs',
  'scripts/gates/non-shared-view-convergence-gate.mjs',
  'scripts/gates/docs-governance-gate.mjs',
  'scripts/gates/final-convergence-gate.mjs',
];
for (const file of requiredGateFiles) assertExists(file, 'final gate chain must be present');

if (failures.length > 0) {
  console.error('\n[final-convergence-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[final-convergence-gate] ok: MVP25 final handoff docs and gates are wired.');
