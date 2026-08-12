#!/usr/bin/env node
import fs, { readFileSync } from 'node:fs';
import path from 'node:path';

function check_theme_matrix_legacy_import_gate() {
  const repoRoot = process.cwd();
  const removedView = path.join(repoRoot, 'src/features/settings/theme/ThemeMatrixView.tsx');

  if (fs.existsSync(removedView)) {
    console.error('[theme-matrix-legacy-import-gate] ThemeMatrixView.tsx should stay removed. Run single-user:gate for details.');
    process.exit(1);
  }

  console.log('[theme-matrix-legacy-import-gate] ok: ThemeMatrix runtime UI is removed.');
}

check_theme_matrix_legacy_import_gate();

function check_shared_view_legacy_forwarder_gate() {
  // Runtime public barrel must point directly at real implementation modules.
  // Physical simplification removes one-line folder forwarders once no consumer needs them.


  function fail(message) {
    console.error(`[shared-view-legacy-forwarder-gate] ${message}`);
    process.exit(1);
  }

  const file = 'src/features/views/runtime/index.ts';
  const source = readFileSync(file, 'utf8');

  const required = [
    "export { TimelineView } from './TimelineView/TimelineViewContainer';",
    "export { EventTimelineView } from './EventTimelineView/EventTimelineViewContainer';",
    "export { StatisticsView } from './StatisticsView/StatisticsViewContainer';",
    "export { PopoverContent } from './StatisticsView/components/PopoverContent';",
  ];
  for (const line of required) if (!source.includes(line)) fail(`${file} must contain: ${line}`);

  const forbidden = [
    "from './TimelineView/index'",
    "from './EventTimelineView/index'",
    "from './StatisticsView/index'",
  ];
  for (const marker of forbidden) if (source.includes(marker)) fail(`${file} must bypass removable folder forwarder: ${marker}`);

  console.log('✅ [shared-view-legacy-forwarder-gate] OK: runtime barrel exports real implementations directly.');
}

check_shared_view_legacy_forwarder_gate();

function check_shared_self_alias_migrated_gate() {
  const root = process.cwd();
  const targets = ['src/shared'];
  const forbidden = /from\s+['"]@shared\//;
  const failures = [];

  function walk(p) {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) walk(path.join(p, entry));
      return;
    }
    if (!/\.(ts|tsx)$/.test(p)) return;
    const rel = path.relative(root, p).replace(/\\/g, '/');
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (forbidden.test(line)) failures.push(`${rel}:${idx + 1}: ${line.trim()}`);
    });
  }

  for (const target of targets) walk(path.join(root, target));

  if (failures.length) {
    console.error('shared-self-alias-migrated-gate failed: src/shared files must use relative imports internally, not @shared/*');
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log('shared-self-alias-migrated-gate passed');
}

check_shared_self_alias_migrated_gate();

function check_mui_compat_migrated_gate() {
  const root = process.cwd();
  const targets = [
    'src',
  ];
  const allowFiles = new Set([
    'src/shared/ui/muiCompat.ts',
  ]);
  const failures = [];

  function walk(p) {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) walk(path.join(p, entry));
      return;
    }
    if (!/\.(ts|tsx)$/.test(p)) return;
    const rel = path.relative(root, p).replace(/\\/g, '/');
    if (allowFiles.has(rel)) return;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/from\s+['"]@mui\/material['"]/.test(line)) failures.push(`${rel}:${idx + 1}: ${line.trim()}`);
    });
  }

  for (const target of targets) walk(path.join(root, target));

  if (failures.length) {
    console.error('mui-compat-migrated-gate failed: all app UI files must import MUI components through muiCompat/@shared public exports');
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log('mui-compat-migrated-gate passed');
}

check_mui_compat_migrated_gate();

function check_shared_view_export_gate() {
  // Runtime business views belong to features/views; settings exposes editors only.

  function read(file) { return readFileSync(file, 'utf8'); }
  function fail(message) { console.error(`[view-export-gate] ${message}`); process.exit(1); }

  const sharedPublic = read('src/shared/public.ts');
  const sharedUiPublic = read('src/shared/ui/public.ts');
  const settingsViewPublic = read('src/features/settings/views/public.ts');
  const viewPublic = read('src/features/views/public.ts');
  const runtimeIndex = read('src/features/views/runtime/index.ts');
  const statisticsIndex = read('src/features/views/runtime/StatisticsView/index.ts');
  const statisticsBridge = read('src/app/dashboard/statisticsPopoverBridge.tsx');
  const layoutRenderer = read('src/app/dashboard/LayoutRenderer.tsx');

  for (const source of [sharedPublic, sharedUiPublic]) {
    if (source.includes('./ui/views') || source.includes('./views')) {
      fail('shared public facades must not export business runtime views. Use @features/views/public.');
    }
  }

  for (const required of ["export * from './runtime';", "export * from './registry';"]) {
    if (!viewPublic.includes(required)) fail(`src/features/views/public.ts must include: ${required}`);
  }
  if (settingsViewPublic.includes("./runtime") || settingsViewPublic.includes('viewModelRegistry')) {
    fail('settings view facade must expose editors/config only, not runtime views or runtime models.');
  }
  if (!settingsViewPublic.includes("./editors/registry")) {
    fail('settings view facade must keep the editor registry.');
  }
  if (statisticsBridge.includes('PopoverContent') && !runtimeIndex.includes('PopoverContent')) {
    fail('runtime index must re-export PopoverContent when dashboard bridge imports it from @features/views/public.');
  }
  if (!statisticsBridge.includes("from '@features/views/public'")) {
    fail('statisticsPopoverBridge must import PopoverContent from @features/views/public.');
  }
  if (!layoutRenderer.includes("from '@features/views/public'")) {
    fail('LayoutRenderer must import ViewToolbar from @features/views/public.');
  }
  if (!statisticsIndex.includes('PopoverContent')) {
    fail('StatisticsView index must export PopoverContent.');
  }
  console.log('✅ [view-export-gate] OK: runtime views are isolated from settings and shared.');
}

check_shared_view_export_gate();

function check_iconaction_gate() {
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
}

check_iconaction_gate();

function check_shared_internal_alias_gate() {
  // Shared internals may use relative imports or the @shared/* internal alias, but
  // must not use the project-root '@/shared/...' alias. The root alias makes files
  // harder to move and hides circular/self-deep dependencies during refactors.


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
}

check_shared_internal_alias_gate();

function check_theme_tree_recursion_gate() {
  const projectRoot = process.cwd();
  const targetFile = path.join(projectRoot, 'src', 'features', 'settings', 'theme', 'ThemeTreeNodeRow.tsx');

  function findLoc(content, idx) {
    const before = content.slice(0, idx);
    const line = before.split(/\r?\n/).length;
    const col = idx - before.lastIndexOf('\n') - 1;
    return `${line}:${col < 0 ? 0 : col}`;
  }

  const violations = [];

  if (!fs.existsSync(targetFile)) {
    console.log('✅ [theme-tree-recursion-gate] OK: target file not found (nothing to check).');
    return;
  }

  const raw = fs.readFileSync(targetFile, 'utf8');

  // naive strip block + line comments (avoid false positives from comments)
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const re = /<\s*ThemeTreeNodeRow\b/g;
  const match = re.exec(code);
  if (match) {
    violations.push({
      file: targetFile,
      loc: findLoc(raw, match.index),
      message: 'Recursive rendering detected: ThemeTreeNodeRow should not render <ThemeTreeNodeRow ...>.',
      hint: 'Use buildThemePathTree(...)+flattenThemePathTree(...) in ThemeMatrixView, then Table.map rows (no recursion).',
    });
  }

  if (violations.length) {
    console.error('\n❌ [theme-tree-recursion-gate] Recursive ThemeTreeNodeRow rendering is not allowed.');
    for (const v of violations) {
      const rel = path.relative(projectRoot, v.file).replace(/\\/g, '/');
      console.error(`[theme-tree-recursion-gate] ${rel}:${v.loc} - ${v.message}`);
      if (v.hint) console.error(`  hint: ${v.hint}`);
    }
    console.error(`\n❌ [theme-tree-recursion-gate] violations: ${violations.length}`);
    process.exit(1);
  }

  console.log('✅ [theme-tree-recursion-gate] OK: no recursive ThemeTreeNodeRow rendering');
}

check_theme_tree_recursion_gate();

function check_selector_giant_subscription_gate() {
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
}

check_selector_giant_subscription_gate();

function check_modal_promise_gate() {
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
}

check_modal_promise_gate();

function check_legacy_forwarder_usage_gate() {
  // Legacy wrapper files may stay temporarily for external/deep-import compatibility,
  // but first-party code should import the real module barrels directly.


  const root = process.cwd();
  const scanRoots = ['src', 'test'];
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

  const forbidden = [
    {
      name: 'legacy TimelineView forwarder',
      patterns: [
        /from\s+['"](?:@shared\/ui\/views\/TimelineView|\.\/TimelineView)['"]/,
        /from\s+['"](?:@\/shared\/ui\/views\/TimelineView|src\/shared\/ui\/views\/TimelineView)['"]/,
      ],
      guidance: "import from './TimelineView/index' or '@shared/public' instead",
    },
    {
      name: 'legacy EventTimelineView forwarder',
      patterns: [
        /from\s+['"](?:@shared\/ui\/views\/EventTimelineView|\.\/EventTimelineView)['"]/,
        /from\s+['"](?:@\/shared\/ui\/views\/EventTimelineView|src\/shared\/ui\/views\/EventTimelineView)['"]/,
      ],
      guidance: "import from './EventTimelineView/index' or '@shared/public' instead",
    },
    {
      name: 'legacy StatisticsView forwarder',
      patterns: [
        /from\s+['"](?:@shared\/ui\/views\/StatisticsView|\.\/StatisticsView)['"]/,
        /from\s+['"](?:@\/shared\/ui\/views\/StatisticsView|src\/shared\/ui\/views\/StatisticsView)['"]/,
      ],
      guidance: "import from './StatisticsView/index' or '@shared/public' instead",
    },
    {
      name: 'legacy themeUtils wrapper',
      patterns: [
        /from\s+['"](?:@\/core\/utils\/themeUtils|@core\/utils\/themeUtils|\.\.?\/.*themeUtils)['"]/,
      ],
      guidance: "import ThemeTreeBuilder helpers from '@core/public' or '@/core/theme/ThemeTreeBuilder' instead",
    },
  ];

  const failures = [];

  function walk(filePath) {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(filePath)) walk(path.join(filePath, entry));
      return;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) return;
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    if (ignoredFiles.has(rel)) return;
    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const rule of forbidden) {
        if (rule.patterns.some((pattern) => pattern.test(line))) {
          failures.push(`${rel}:${idx + 1}: ${rule.name}: ${line.trim()} (${rule.guidance})`);
        }
      }
    });
  }

  for (const scanRoot of scanRoots) walk(path.join(root, scanRoot));

  if (failures.length) {
    console.error('legacy-forwarder-usage-gate failed: first-party code must not depend on legacy wrapper forwarders');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  console.log('legacy-forwarder-usage-gate passed');
}

check_legacy_forwarder_usage_gate();
