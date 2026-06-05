#!/usr/bin/env node
// Shared internals may use relative imports or the @shared/* internal alias, but
// must not use the project-root '@/shared/...' alias. The root alias makes files
// harder to move and hides circular/self-deep dependencies during refactors.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_SHARED = path.join(ROOT, 'src/shared');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(full))) out.push(full);
  }
  return out;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
}

const violations = [];
const importRe = /(?:import\s+[^;]*?from\s+|export\s+[^;]*?from\s+|require\()\s*['"]([^'"]+)['"]/g;

for (const file of walk(SRC_SHARED)) {
  const source = stripComments(fs.readFileSync(file, 'utf8'));
  let match;
  while ((match = importRe.exec(source))) {
    if (match[1].startsWith('@/shared/')) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${rel(file)}:${line} imports '${match[1]}'`);
    }
  }
}

if (violations.length) {
  console.error('❌ [shared-internal-alias-gate] src/shared must not import through @/shared/*.');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nFix: use a relative import inside src/shared, or @shared/* when intentionally targeting a shared internal alias.');
  process.exit(1);
}

console.log('✅ [shared-internal-alias-gate] OK: shared internal imports avoid @/shared root alias.');
