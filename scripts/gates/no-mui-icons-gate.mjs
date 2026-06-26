#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.[cm]?[jt]sx?$/.test(entry)) files.push(path);
  }
  return files;
}

for (const file of walk(join(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('@mui/icons-material')) {
    failures.push(`${relative(root, file)} imports @mui/icons-material; use @shared/public in app/features/platform code and keep implementation in @shared/ui/icons`);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.dependencies?.['@mui/icons-material'] || pkg.devDependencies?.['@mui/icons-material']) {
  failures.push('package.json still depends on @mui/icons-material; keep runtime icons local and lightweight');
}

const lockPath = join(root, 'package-lock.json');
if (existsSync(lockPath)) {
  const lockText = readFileSync(lockPath, 'utf8');
  if (lockText.includes('node_modules/@mui/icons-material') || lockText.includes('"@mui/icons-material"')) {
    failures.push('package-lock.json still references @mui/icons-material; update the lockfile after removing the dependency');
  }
}

if (!existsSync(join(root, 'src/shared/ui/icons/index.tsx'))) {
  failures.push('src/shared/ui/icons/index.tsx missing; local icons must remain centralized');
}

if (failures.length > 0) {
  console.error('\n[no-mui-icons-gate] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[no-mui-icons-gate] ok: runtime icon imports stay local and lightweight');
