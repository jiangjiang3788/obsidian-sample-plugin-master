import path from 'path';

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function normalizeLoc(loc) {
  if (!loc) return '0:0';
  if (/^\d+$/.test(loc)) return `${loc}:0`;
  return loc;
}

function relFile(rootDir, file) {
  try {
    const rel = path.relative(rootDir, file);
    return toPosix(rel);
  } catch {
    return toPosix(String(file));
  }
}

export function printOk(ruleId, message) {
  console.log(`✅ [${ruleId}] ${message}`);
}

export function failWithViolations(ruleId, violations, opts = {}) {
  const rootDir = opts.rootDir || process.cwd();
  const summary = opts.summary || 'Gate failed';

  console.error(`\n❌ [${ruleId}] ${summary}`);
  for (const v of violations) {
    const file = relFile(rootDir, v.file);
    const loc = normalizeLoc(v.loc);
    console.error(`[${ruleId}] ${file}:${loc} - ${v.message}`);
    if (v.hint) console.error(`  hint: ${v.hint}`);
  }
  console.error(`\n❌ [${ruleId}] violations: ${violations.length}`);
  process.exit(1);
}
