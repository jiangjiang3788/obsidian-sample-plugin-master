import fs from 'fs';
import path from 'path';

// Lightweight audit: report shared/ui imports that tend to re-introduce business coupling.
// This script is intentionally non-failing (exit 0). Use it to generate a TODO list.

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'src', 'shared', 'ui');

// 例外白名单：已迁出 runtime UI 到 src/app/ui/**，shared/ui 不再允许依赖 app/public 的 store/services。
const ALLOW_APP_PUBLIC_RUNTIME = new Set([
  path.join(ROOT, 'src/shared/ui/items/TaskRow.tsx'),
  path.join(ROOT, 'src/shared/ui/views/BlockView.tsx'),
  path.join(ROOT, 'src/shared/ui/views/EventTimelineView.tsx'),
  path.join(ROOT, 'src/shared/ui/views/HeatmapView.tsx'),
  path.join(ROOT, 'src/shared/ui/views/StatisticsView.tsx'),
  path.join(ROOT, 'src/shared/ui/views/TableView.tsx'),
  path.join(ROOT, 'src/shared/ui/views/timelineInteraction.ts'),
]);

/** @param {string} dir */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/(\.ts|\.tsx|\.js|\.jsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** @param {string} text */
function extractImports(text) {
  const lines = text.split(/\r?\n/);
  return lines
    .filter((l) => l.trim().startsWith('import '))
    .map((l) => l.trim());
}

const files = walk(TARGET_DIR);

const findings = [];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const imports = extractImports(text);

  for (const imp of imports) {
    // Deep app imports (should be avoided; prefer app/public)
    if (/from\s+['\"]@\/app\//.test(imp) && !/from\s+['\"]@\/app\/public['\"]/.test(imp)) {
      findings.push({ file: f, kind: 'deep-app-import', line: imp });
    }

    // App public store access in shared/ui (allowed today, but often a smell)
    if (
      /from\s+['\"]@\/app\/public['\"]/.test(imp) &&
      /useZustandAppStore|createServices|mountWithServices/.test(imp) &&
      !ALLOW_APP_PUBLIC_RUNTIME.has(f)
    ) {
      findings.push({ file: f, kind: 'app-public-store-or-services', line: imp });
    }

    // Direct core public value imports that are likely business-y (types are ok)
    if (/from\s+['\"]@core\/public['\"]/.test(imp) && /ItemService|ActionService|DataStore|Service/.test(imp)) {
      findings.push({ file: f, kind: 'core-public-service-ish', line: imp });
    }
  }
}

if (findings.length === 0) {
  console.log('[audit:shared-ui-imports] No findings. ✅');
  process.exit(0);
}

console.log('[audit:shared-ui-imports] Findings (non-failing):');
for (const it of findings) {
  const rel = path.relative(ROOT, it.file);
  console.log(`- [${it.kind}] ${rel}`);
  console.log(`    ${it.line}`);
}

process.exit(0);
