import fs from 'node:fs';
import path from 'node:path';

// Heuristic gate: any Modal wrapper that returns a Promise must resolve onClose.
// We keep it simple and explicit to avoid false positives.

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function stripComments(code) {
  // crude but effective for our purposes
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = walk(SRC_DIR);
const violations = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);

  // Only inspect Modal classes.
  if (!/extends\s+Modal\b/.test(code)) continue;

  // Case A: resolvePromise pattern (platform modals)
  if (/openAndGet\w*\s*\(/.test(code) && /new\s+Promise\s*\(/.test(code) && /resolvePromise/.test(code)) {
    const hasOnClose = /\bonClose\s*\(\)\s*\{[\s\S]*?\}/m.test(code);
    const onCloseMentionsResolve = /\bonClose\s*\(\)\s*\{[\s\S]*?resolvePromise[\s\S]*?\}/m.test(code);
    if (!hasOnClose || !onCloseMentionsResolve) {
      violations.push({ rel, reason: 'Modal has openAndGet* Promise + resolvePromise but onClose does not resolve.' });
    }
  }

  // Case B: main.ts TextPromptModal pattern (resolveOnce)
  if (rel === 'src/main.ts' && /class\s+TextPromptModal\s+extends\s+Modal/.test(code)) {
    const hasResolveOnce = /resolveOnce\s*\(/.test(code);
    const onCloseCallsResolveOnce = /\bonClose\s*\(\)\s*:\s*void\s*\{[\s\S]*?resolveOnce\s*\(/m.test(code);
    if (hasResolveOnce && !onCloseCallsResolveOnce) {
      violations.push({ rel, reason: 'TextPromptModal must resolveOnce(...) in onClose.' });
    }
  }
}

if (violations.length) {
  console.error('❌ [modal-promise-gate] Found modal Promise hang risks:');
  for (const v of violations) {
    console.error(` - ${v.rel}: ${v.reason}`);
  }
  process.exit(1);
}

console.log('✅ [modal-promise-gate] All Promise-returning Modals resolve on close.');
