import fs from 'fs';
import path from 'path';

// Lightweight audit: report shared/ui imports that tend to re-introduce business coupling.
// This script is intentionally non-failing (exit 0). Use it to generate a TODO list.

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'src', 'shared', 'ui');

// 当前允许的例外：这些模块是“UI runtime/浮窗/输入系统”的基础设施，
// 暂时允许读取 app/public 的 store 或 services（后续若要完全纯化可再上移）。
const ALLOW_APP_PUBLIC_RUNTIME = new Set([
  path.join(TARGET_DIR, 'modals', 'QuickInputModal.tsx'),
  path.join(TARGET_DIR, 'components', 'QuickInputEditor.tsx'),
  path.join(TARGET_DIR, 'primitives', 'FloatingPanel.tsx'),
  path.join(TARGET_DIR, 'widgets', 'FloatingWidget.ts'),
  path.join(TARGET_DIR, 'widgets', 'FloatingWidgetManager.ts'),
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
