#!/usr/bin/env node
import fs, { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path, { join, relative } from 'node:path';

function check_no_mui_icons_gate() {
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
}

check_no_mui_icons_gate();

function check_src_console_gate() {
  // Guard production source paths from reintroducing ad-hoc console.* calls.
  // Central diagnostic utilities are allowed; feature/UI/platform files should
  // route diagnostics through @shared/public diagnostic helpers or core devLogger.


  const root = process.cwd();
  const srcDir = join(root, 'src');

  const allowed = new Set([
    'src/core/utils/devLogger.ts',
    'src/core/recordInput/debug.ts',
    'src/shared/utils/diagnosticConsole.ts',
  ]);

  const consoleCallRe = /(^|[^\w"'`])console\.(log|warn|error|info|trace|groupCollapsed|groupEnd|time|timeEnd)\s*\(/;
  const files = [];

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(abs);
    }
  }

  walk(srcDir);

  const violations = [];
  for (const abs of files) {
    const rel = relative(root, abs).replace(/\\/g, '/');
    if (allowed.has(rel)) continue;
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (consoleCallRe.test(line)) {
        violations.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
  }

  if (violations.length) {
    console.error('❌ [src-console-gate] Raw console.* calls are not allowed outside diagnostic utilities.');
    for (const v of violations) {
      console.error(`- ${v.file}:${v.line} ${v.text}`);
    }
    console.error('\nFix: use diagnosticLog/diagnosticWarn/diagnosticError from @shared/public, or core devLogger/recordDebug for core-only code.');
    process.exit(1);
  }

  console.log('✅ [src-console-gate] OK: src console output is centralized.');
}

check_src_console_gate();

function check_unused_export_candidates_gate() {
  // Tracks cleanup candidates that are no longer used by first-party code.
  // This is intentionally lightweight and deterministic: it does not try to be
  // a full tree-shaker, but it does protect known legacy wrappers from being
  // reintroduced through project imports or public barrels.


  const root = process.cwd();
  const scanRoots = ['src', 'test'];
  const sourceExt = /\.(ts|tsx|js|jsx)$/;

  const ignoredFiles = new Set([
    'src/features/views/runtime/TimelineView.tsx',
    'src/features/views/runtime/EventTimelineView.tsx',
    'src/features/views/runtime/StatisticsView.tsx',
    'src/features/views/runtime/index.ts',
    'src/core/utils/themeUtils.ts',
    'src/core/utils/public.ts',
    'src/features/progression/types.ts',
    'src/features/progression/computeProgression.ts',
    'src/features/settings/SettingsTab.tsx',
    'src/features/quickinput/QuickInputModal.tsx',
  ]);

  const candidates = [
    {
      name: 'legacy TimelineView forwarder',
      file: 'src/features/views/runtime/TimelineView.tsx',
      importPatterns: [
        /from\s+['"](?:@shared\/ui\/views\/TimelineView|@\/shared\/ui\/views\/TimelineView)['"]/, 
        /from\s+['"](?:\.\/TimelineView|\.\.\/views\/TimelineView)['"]/, 
      ],
    },
    {
      name: 'legacy EventTimelineView forwarder',
      file: 'src/features/views/runtime/EventTimelineView.tsx',
      importPatterns: [
        /from\s+['"](?:@shared\/ui\/views\/EventTimelineView|@\/shared\/ui\/views\/EventTimelineView)['"]/, 
        /from\s+['"](?:\.\/EventTimelineView|\.\.\/views\/EventTimelineView)['"]/, 
      ],
    },
    {
      name: 'legacy StatisticsView forwarder',
      file: 'src/features/views/runtime/StatisticsView.tsx',
      importPatterns: [
        /from\s+['"](?:@shared\/ui\/views\/StatisticsView|@\/shared\/ui\/views\/StatisticsView)['"]/, 
        /from\s+['"](?:\.\/StatisticsView|\.\.\/views\/StatisticsView)['"]/, 
      ],
    },
    {
      name: 'legacy themeUtils wrapper',
      file: 'src/core/utils/themeUtils.ts',
      importPatterns: [
        /from\s+['"](?:@core\/utils\/themeUtils|@\/core\/utils\/themeUtils)['"]/, 
        /from\s+['"][^'"]*themeUtils['"]/, 
      ],
      forbiddenPublicExports: [
        { file: 'src/core/utils/public.ts', pattern: /export\s+\*\s+from\s+['"]\.\/themeUtils['"]/ },
      ],
    },
  ];

  function rel(file) {
    return path.relative(root, file).replace(/\\/g, '/');
  }

  function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (sourceExt.test(entry.name)) out.push(full);
    }
    return out;
  }

  const files = scanRoots.flatMap((scanRoot) => walk(path.join(root, scanRoot)));
  const failures = [];

  for (const candidate of candidates) {
    if (!fs.existsSync(path.join(root, candidate.file))) {
      // Already deleted is acceptable; keep this gate compatible with future cleanup.
      continue;
    }

    for (const publicExport of candidate.forbiddenPublicExports ?? []) {
      const file = path.join(root, publicExport.file);
      if (!fs.existsSync(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (publicExport.pattern.test(source)) {
        failures.push(`${publicExport.file}: should not publicly export ${candidate.name}`);
      }
    }

    for (const file of files) {
      const fileRel = rel(file);
      if (ignoredFiles.has(fileRel)) continue;
      const source = fs.readFileSync(file, 'utf8');
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (candidate.importPatterns.some((pattern) => pattern.test(line))) {
          failures.push(`${fileRel}:${index + 1}: imports ${candidate.name}: ${line.trim()}`);
        }
      });
    }
  }

  if (failures.length) {
    console.error('❌ [unused-export-candidates-gate] Known cleanup candidates are still referenced.');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('✅ [unused-export-candidates-gate] OK: known cleanup candidates are unused by first-party code.');
}

check_unused_export_candidates_gate();

function check_performance_boundary_gate() {
  // Keep shared performance monitoring focused on the small API surface actually
  // used by the plugin bootstrap path. This prevents the utility from becoming a
  // background reporter / catch-all diagnostics subsystem again.


  function fail(message) {
    console.error(`[performance-boundary-gate] ${message}`);
    process.exit(1);
  }

  const file = 'src/shared/utils/performance.ts';
  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/).length;

  if (lines > 260) {
    fail(`${file} is ${lines} lines; keep it <= 260 lines.`);
  }

  const forbidden = [
    ['reportTimer', 'auto-report timers are not part of the MVP performance utility'],
    ['setInterval(', 'performance monitoring must not create background timers'],
    ['errorHandler', 'performance monitoring should not depend on global error handling'],
    ['console.', 'performance diagnostics must use devLogger helpers, not console'],
    ['performance.mark', 'performance marks are unnecessary for the lightweight bootstrap timer'],
    ['performance.measure', 'performance measures are unnecessary for the lightweight bootstrap timer'],
    ['PropertyDescriptor', 'decorator compatibility has been removed; use explicit startMeasure'],
    ['export function Measure', 'decorator compatibility has been removed; use explicit startMeasure'],
  ];

  for (const [needle, reason] of forbidden) {
    if (source.includes(needle)) {
      fail(`${file} contains "${needle}"; ${reason}.`);
    }
  }

  for (const symbol of ['startMeasure']) {
    const pattern = new RegExp(`export\\s+(const|async\\s+function|function)\\s+${symbol}\\b`);
    if (!pattern.test(source)) {
      fail(`${file} must keep exported ${symbol}.`);
    }
  }

  console.log('✅ [performance-boundary-gate] OK: performance utility stays focused.');
}

check_performance_boundary_gate();
