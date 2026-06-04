#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const releaseRoot = join(root, 'release');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const packageDir = join(releaseRoot, manifest.id);
const zipPath = join(releaseRoot, `${manifest.id}-release.zip`);
const allowedFiles = ['manifest.json', 'main.js', 'styles.css'];
const forbiddenNames = new Set([
  'data.json',
  'data.example.json',
  'main.js.map',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.test.json',
  'vite.config.ts',
]);
const forbiddenTopLevelDirs = new Set([
  'src',
  'doc',
  'docs',
  'test',
  'tests',
  'scripts',
  'reports',
  'dist',
  'node_modules',
  '.git',
  'coverage',
]);

function fail(message) {
  console.error(`[package-release] ${message}`);
  process.exit(1);
}

function listFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...listFiles(full, base));
    } else {
      files.push(relative(base, full).replaceAll('\\\\', '/'));
    }
  }
  return files;
}

for (const file of allowedFiles) {
  if (!existsSync(join(root, file))) {
    fail(`missing required release artifact: ${file}. Run npm run build first.`);
  }
}

for (const name of forbiddenNames) {
  if (allowedFiles.includes(name)) continue;
  if (existsSync(join(root, name)) && name === 'data.json') {
    fail('data.json exists at project root. Remove it before packaging.');
  }
}

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });
for (const file of allowedFiles) {
  copyFileSync(join(root, file), join(packageDir, file));
}

const packagedFiles = listFiles(packageDir).sort();
const unexpected = packagedFiles.filter((file) => !allowedFiles.includes(file));
if (unexpected.length > 0) {
  fail(`unexpected files in release package: ${unexpected.join(', ')}`);
}

for (const file of packagedFiles) {
  const firstSegment = file.split('/')[0];
  if (forbiddenNames.has(file) || forbiddenTopLevelDirs.has(firstSegment) || file.endsWith('.map')) {
    fail(`forbidden file reached release package: ${file}`);
  }
}

const zip = spawnSync('zip', ['-r', '-X', zipPath, manifest.id], {
  cwd: releaseRoot,
  stdio: 'pipe',
  encoding: 'utf8',
});
if (zip.status !== 0) {
  fail(`zip command failed: ${zip.stderr || zip.stdout}`);
}

console.log(`[package-release] wrote ${relative(root, zipPath)}`);
console.log(`[package-release] files: ${packagedFiles.join(', ')}`);
