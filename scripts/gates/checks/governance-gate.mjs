#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const groups = ['product', 'architecture', 'records', 'task-session', 'energy', 'ui-runtime', 'quality', 'stability'];
const entry = String(pkg.scripts?.['check:contracts'] || '');
const referenced = new Set();
for (const group of groups) {
  const file = `scripts/gates/${group}-gate.mjs`;
  if (!entry.includes(`node ${file}`)) failures.push(`check:contracts 未包含 ${file}`);
  if (!fs.existsSync(path.join(root, file))) { failures.push(`缺少 ${file}`); continue; }
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/"([^"]+-gate\.mjs)"/g)) referenced.add(match[1]);
}
for (const check of referenced) {
  if (!fs.existsSync(path.join(root, 'scripts/gates/checks', check))) failures.push(`缺少内部检查：${check}`);
}
for (const name of Object.keys(pkg.scripts || {})) {
  if (name.startsWith('gate:') || /[\u3400-\u9fff]/.test(name)) failures.push(`过时/重复的公开命令名：${name}`);
}
for (const test of ['recordTemplateQueryFlow.test.ts', 'recordRepositoryLifecycle.test.ts', 'taskSessionIntegrity.test.ts']) {
  if (!fs.existsSync(path.join(root, 'test/integration', test))) failures.push(`缺少关键集成测试：${test}`);
}
if (!pkg.scripts?.check?.includes('npm run check:contracts')) failures.push('check 未接入内部契约检查。');
for (const [name, command] of Object.entries(pkg.scripts || {})) {
  // Catch accidental references to renamed/deleted npm scripts before a CI run.
  for (const match of command.matchAll(/\bnpm\s+(?:--silent\s+)?run\s+([a-z][a-z0-9:-]*)/gi)) {
    if (!pkg.scripts[match[1]]) failures.push(`${name} 引用了不存在的 npm 命令：${match[1]}`);
  }
}

if (failures.length) {
  console.error('[governance] FAILED');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`[governance] PASS：${groups.length} 个内部检查组、${referenced.size} 项专项检查；无需公开 gate:* 别名。`);
