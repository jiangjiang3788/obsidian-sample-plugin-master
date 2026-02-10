#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Events Boundary Gate
// ---------------------------------------------------------------------------
// Goal:
// - src/platform/** is the ONLY place allowed to subscribe to Obsidian vault/workspace events
//   via app.vault.on / app.workspace.on / workspace.on / vault.on
// - non-platform code must use EventsPort instead (and remain dispose-safe)
//
// This gate prevents regressions.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');

const patterns = [
  { name: 'vault.on', re: /\b(app\.)?vault\.on\s*\(/g },
  { name: 'workspace.on', re: /\b(app\.)?workspace\.on\s*\(/g },
  { name: 'registerEvent', re: /\bregisterEvent\s*\(/g },
];

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && /\.(ts|tsx|mts|cts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function isPlatform(absPath) {
  const rel = path.relative(srcRoot, absPath).replace(/\\/g, '/');
  return rel.startsWith('platform/');
}

function findHits(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  for (const pat of patterns) {
    pat.re.lastIndex = 0;
    if (pat.re.test(text)) hits.push(pat.name);
  }
  return hits;
}

const files = walk(srcRoot).filter(f => !isPlatform(f));

const violations = [];
for (const f of files) {
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  const hits = findHits(f);
  // registerEvent is only meaningful when paired with vault/workspace usage, but still keep it platform-only
  if (hits.length > 0) {
    violations.push({ file: rel, hits });
  }
}

if (violations.length === 0) {
  console.log('✅ [events-boundary-gate] No vault/workspace subscriptions outside src/platform/**');
  process.exit(0);
}

console.log('❌ [events-boundary-gate] Found Obsidian event subscriptions outside src/platform/**');
for (const v of violations) {
  console.log(`- ${v.file} (${v.hits.join(', ')})`);
}
process.exit(1);
