#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const targets = ['src/shared'];
const forbidden = /from\s+['"]@shared\//;
const failures = [];

function walk(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) walk(path.join(p, entry));
    return;
  }
  if (!/\.(ts|tsx)$/.test(p)) return;
  const rel = path.relative(root, p).replace(/\\/g, '/');
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (forbidden.test(line)) failures.push(`${rel}:${idx + 1}: ${line.trim()}`);
  });
}

for (const target of targets) walk(path.join(root, target));

if (failures.length) {
  console.error('shared-self-alias-migrated-gate failed: src/shared files must use relative imports internally, not @shared/*');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('shared-self-alias-migrated-gate passed');
