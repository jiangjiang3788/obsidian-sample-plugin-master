import fs from 'fs';
import path from 'path';

// IconAction gate: prevent re-introducing "<Tooltip><IconButton/></Tooltip>" pattern.
// Allowlist: add `// iconaction-gate: allow` anywhere in the file.

const projectRoot = process.cwd();
function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(abs, acc);
    } else if (e.isFile()) {
      if (abs.endsWith('.ts') || abs.endsWith('.tsx')) {
        acc.push(abs);
      }
    }
  }
  return acc;
}

const files = walk(path.join(projectRoot, 'src'));

const violations = [];

for (const abs of files) {
  const rel = path.relative(projectRoot, abs);
  const text = fs.readFileSync(abs, 'utf8');

  if (text.includes('iconaction-gate: allow')) {
    continue;
  }

  // More precise: detect actual nesting pattern "<Tooltip ...><IconButton ...>...</IconButton></Tooltip>"
  // with a conservative window to avoid pathological matches.
  const legacyPattern = /<Tooltip\b[\s\S]{0,4000}?<IconButton\b[\s\S]{0,4000}?<\/IconButton>[\s\S]{0,4000}?<\/Tooltip>/m;

  if (legacyPattern.test(text)) {
    violations.push(rel);
  }
}

if (violations.length) {
  console.error('❌ [iconaction-gate] Detected legacy Tooltip + IconButton usage in:');
  for (const f of violations) {
    console.error(`  - ${f}`);
  }
  console.error('\nFix: replace with <IconAction .../> from @shared/public, or add `// iconaction-gate: allow` if truly necessary.');
  process.exit(1);
}

console.log('✅ [iconaction-gate] OK: no legacy Tooltip+IconButton pattern found');
