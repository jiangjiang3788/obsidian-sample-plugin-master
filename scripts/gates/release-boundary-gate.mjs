#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const packageDir = join(root, 'release', manifest.id);
const allowedFiles = new Set(['manifest.json', 'main.js', 'styles.css']);
const forbiddenTopLevel = new Set([
  'src', 'doc', 'docs', 'test', 'tests', 'scripts', 'reports', 'dist', 'node_modules', '.git', 'coverage'
]);
const forbiddenExact = new Set([
  'data.json', 'data.example.json', 'main.js.map', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.test.json', 'vite.config.ts'
]);

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).replaceAll('\\\\', '/'));
  }
  return out;
}

function fail(message) {
  console.error(`[release-boundary-gate] ${message}`);
  process.exit(1);
}

if (!existsSync(packageDir)) {
  fail('release/<manifest.id> does not exist. Run npm run package:release first.');
}

const files = walk(packageDir).sort();
const missing = [...allowedFiles].filter((file) => !files.includes(file));
if (missing.length > 0) fail(`missing required files: ${missing.join(', ')}`);

const unexpected = files.filter((file) => !allowedFiles.has(file));
if (unexpected.length > 0) fail(`unexpected files: ${unexpected.join(', ')}`);

for (const file of files) {
  const first = file.split('/')[0];
  if (forbiddenExact.has(file) || forbiddenTopLevel.has(first) || file.endsWith('.map')) {
    fail(`forbidden release file: ${file}`);
  }
}

console.log(`[release-boundary-gate] ok: ${files.join(', ')}`);
