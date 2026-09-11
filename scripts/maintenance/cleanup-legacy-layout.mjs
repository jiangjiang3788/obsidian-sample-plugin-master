#!/usr/bin/env node
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const legacyFiles = [
  '.eslintignore',
  '.eslintrc-architecture.js',
  '.eslintrc.cjs',
  '.jscpd.json',
  'data.example.json',
  'knip.json',
  'tsconfig.json',
  'tsconfig.test.json',
  'tsconfig.e2e.json',
  'vite.config.ts',
  'scripts/tsconfig.json',
];
const legacyDirs = ['examples', 'dist', 'build', 'release', '.venv'];

if (!existsSync(resolve(root, 'config/tsconfig.json')) || !existsSync(resolve(root, 'config/vite.config.ts'))) {
  console.error('[cleanup-layout] config/ is incomplete; refusing to remove legacy configuration files');
  process.exit(1);
}

for (const rel of legacyFiles) {
  const target = resolve(root, rel);
  if (!existsSync(target)) continue;
  rmSync(target, { force: true });
  console.log(`[cleanup-layout] removed ${rel}`);
}

for (const rel of legacyDirs) {
  const target = resolve(root, rel);
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  console.log(`[cleanup-layout] removed ${rel}/`);
}

console.log('[cleanup-layout] complete; data.json was intentionally left untouched');
