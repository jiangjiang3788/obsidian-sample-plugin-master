#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const groups = ['product','architecture','records','task-session','energy','ui-runtime','quality','stability'];
const exposed = Object.keys(pkg.scripts || {}).filter((key) => key.startsWith('gate:')).sort();
if (exposed.length !== groups.length) failures.push(`expected exactly ${groups.length} aggregate gate commands, got ${exposed.length}`);
const referenced = new Set();
for (const group of groups) {
  const file = `scripts/gates/${group}-gate.mjs`;
  if (!pkg.scripts?.[`gate:${group}`]) failures.push(`missing gate:${group}`);
  if (!pkg.scripts?.gate?.includes(`npm run gate:${group}`)) failures.push(`main gate missing gate:${group}`);
  if (!fs.existsSync(path.join(root,file))) { failures.push(`missing ${file}`); continue; }
  const text = fs.readFileSync(path.join(root,file),'utf8');
  for (const match of text.matchAll(/"([^"]+-gate\.mjs)"/g)) referenced.add(match[1]);
}
for (const check of referenced) if (!fs.existsSync(path.join(root,'scripts/gates/checks',check))) failures.push(`aggregate references missing check: ${check}`);
for (const test of ['recordTemplateQueryFlow.test.ts','recordRepositoryLifecycle.test.ts','taskSessionIntegrity.test.ts']) {
  if (!fs.existsSync(path.join(root,'test/integration',test))) failures.push(`missing integration scenario ${test}`);
}
if (pkg.scripts?.['docs:index'] || pkg.scripts?.['folder:verify']) failures.push('historical docs/folder-plan workflows must stay retired');
if (failures.length) { console.error('[governance] failed'); failures.forEach((f)=>console.error(`- ${f}`)); process.exit(1); }
console.log(`[governance] PASS (${groups.length} aggregate gates; ${referenced.size} referenced internal checks)`);
