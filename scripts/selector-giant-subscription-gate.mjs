import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && (p.endsWith('.ts') || p.endsWith('.tsx'))) out.push(p);
  }
  return out;
}

function stripComments(code) {
  // Remove block comments and line comments (simple, good enough for gate)
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ALLOW_DIRS = [
  path.join(SRC, 'app', 'bootstrap'),
  path.join(SRC, 'app', 'store', 'selectors'),
  path.join(SRC, 'platform'),
];

function isAllowed(file) {
  return ALLOW_DIRS.some(d => file.startsWith(d));
}

const violations = [];

for (const file of walk(SRC)) {
  if (isAllowed(file)) continue;

  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);

  // Disallow subscribing to the whole settings object (too big, causes broad rerenders)
  const pattern = /use(Zustand)?AppStore\s*\(\s*\(?\s*(state|s)\s*=>\s*(state|s)\.settings\b/g;
  if (pattern.test(code)) {
    violations.push({ file, kind: 'subscribe-whole-settings' });
  }

  // Also disallow returning the entire state object.
  const pattern2 = /use(Zustand)?AppStore\s*\(\s*\(?\s*(state|s)\s*=>\s*\2\b/g;
  if (pattern2.test(code)) {
    violations.push({ file, kind: 'subscribe-whole-state' });
  }
}

if (violations.length) {
  console.error('❌ [selector-giant-subscription-gate] Found oversized store subscriptions outside allowed dirs:');
  for (const v of violations) {
    console.error(` - ${path.relative(ROOT, v.file)}  (${v.kind})`);
  }
  process.exit(1);
}

console.log('✅ [selector-giant-subscription-gate] No oversized store subscriptions (state/settings) outside allowed dirs.');
