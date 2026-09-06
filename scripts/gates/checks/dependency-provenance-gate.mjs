#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const lockPackages = lock.packages ?? {};

if (pkg.dependencies?.minisearch || pkg.devDependencies?.minisearch) {
  failures.push('minisearch must not be a root dependency; Retrieval uses the internal LocalRetrievalIndex');
}
if (lockPackages['node_modules/minisearch']) {
  failures.push('package-lock.json must not retain node_modules/minisearch');
}

for (const [lockPath, entry] of Object.entries(lockPackages)) {
  const resolved = typeof entry?.resolved === 'string' ? entry.resolved : '';
  if (resolved.includes('applied-caas-gateway') || resolved.includes('internal.api.openai.org')) {
    failures.push(`package-lock.json contains environment-local registry provenance at ${lockPath}`);
  }
}

for (const root of ['src', 'test']) {
  walk(root, (filePath) => {
    if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) return;
    const source = fs.readFileSync(filePath, 'utf8');
    if (/\bfrom\s+['"]minisearch['"]|\brequire\(\s*['"]minisearch['"]\s*\)/.test(source)) {
      failures.push(`${filePath} must use the internal Retrieval index instead of minisearch`);
    }
  });
}

if (failures.length) {
  console.error('[dependency-provenance] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[dependency-provenance] PASS (portable lock provenance; Retrieval has no minisearch package dependency)');

function walk(root, visit) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  }
}
