#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const targets = [
  'src',
];
const allowFiles = new Set([
  'src/shared/ui/muiCompat.ts',
]);
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
  if (allowFiles.has(rel)) return;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (/from\s+['"]@mui\/material['"]/.test(line)) failures.push(`${rel}:${idx + 1}: ${line.trim()}`);
  });
}

for (const target of targets) walk(path.join(root, target));

if (failures.length) {
  console.error('mui-compat-migrated-gate failed: all app UI files must import MUI components through muiCompat/@shared public exports');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('mui-compat-migrated-gate passed');
