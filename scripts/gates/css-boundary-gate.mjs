#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { failWithViolations, printOk } from '../lib/gate-formatter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(__dirname, 'css-boundary-baseline.json');
const IMPORTANT_ALLOWLIST_PATH = path.join(__dirname, 'css-important-allowlist.json');
const WRITE_BASELINE = process.argv.includes('--write-baseline');
const RULE_ID = 'css-boundary-gate';

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, predicate) : (predicate(full) ? [full] : []);
  });
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripImportRules(source) {
  return source.replace(/@import\s+(?:url\([^)]*\)|["'][^"']+["'])(?:\s+layer\([^)]*\))?[^;]*;/g, '');
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

const allowedClassPrefixes = [
  'think-', 'sv-', 'tn-', 'et-', 'bv-', 'excel-', 'mod-', 'is-', 'has-',
  'theme-', 'workspace-', 'markdown-', 'metadata-', 'suggestion-', 'vertical-',
  'horizontal-', 'cm-', 'modal-', 'menu-', 'nav-', 'setting-', 'clickable-',
  'Mui', 'heatmap-', 'cell-', 'month-', 'statistics-', 'timeline-', 'daily-',
  'day-', 'progress-', 'summary-', 'task-', 'time-', 'event-', 'module-', 'tp-',
  'tag-', 'message-', 'md-', 'layout-', 'row-', 'week-', 'text-',
];

const allowedExactClasses = new Set([
  'modal', 'active', 'calendar', 'current-day', 'empty', 'grid-spacer', 'grid-view',
  'large', 'medium', 'small', 'pure-count', 'visual-content', 'empty-label-text', 'block-language-think',
]);

function isUnprefixedClass(name) {
  return !allowedExactClasses.has(name) && !allowedClassPrefixes.some((prefix) => name.startsWith(prefix));
}

function collect() {
  const css = {};
  const scripts = {};
  for (const file of walk(SRC, (candidate) => candidate.endsWith('.css'))) {
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    const relative = rel(file);
    const selectorSource = stripImportRules(source)
      .replace(/@layer\s+[^;{]+;/g, '');
    const classes = [...selectorSource.matchAll(/\.(-?[_a-zA-Z]+[\w-]*)/g)].map((match) => match[1]);
    const colors = [...source.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\([^)]*\)/gi)].map((match) => match[0].toLowerCase());
    css[relative] = {
      important: count(source, /!important\b/g),
      colors: [...new Set(colors)].sort(),
      colorOccurrences: colors.length,
      unprefixedClasses: [...new Set(classes.filter(isUnprefixedClass))].sort(),
    };
  }
  for (const file of walk(SRC, (candidate) => /\.(?:ts|tsx|js|jsx)$/.test(candidate))) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = rel(file);
    scripts[relative] = {
      staticStyle: count(source, /\bstyle\s*=\s*\{\{/g),
      staticSx: count(source, /\bsx\s*=\s*\{\{/g),
    };
  }
  return { css, scripts };
}

const snapshot = collect();
if (WRITE_BASELINE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const importantFiles = Object.fromEntries(
    Object.entries(snapshot.css)
      .filter(([, metrics]) => metrics.important > 0)
      .map(([file, metrics]) => [file, {
        maxOccurrences: metrics.important,
        reason: 'V1 legacy baseline; reduce during feature migration and never increase.',
      }])
  );
  fs.writeFileSync(IMPORTANT_ALLOWLIST_PATH, `${JSON.stringify({ files: importantFiles }, null, 2)}\n`, 'utf8');
  console.log(`[${RULE_ID}] baseline written.`);
  process.exit(0);
}

const violations = [];
if (!fs.existsSync(BASELINE_PATH)) {
  violations.push({ file: BASELINE_PATH, loc: '1:1', message: 'CSS boundary baseline is missing.' });
}
if (!fs.existsSync(IMPORTANT_ALLOWLIST_PATH)) {
  violations.push({ file: IMPORTANT_ALLOWLIST_PATH, loc: '1:1', message: '!important allowlist is missing.' });
}

const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : { css: {}, scripts: {} };
const importantAllowlist = fs.existsSync(IMPORTANT_ALLOWLIST_PATH)
  ? JSON.parse(fs.readFileSync(IMPORTANT_ALLOWLIST_PATH, 'utf8')).files ?? {}
  : {};

for (const [file, metrics] of Object.entries(snapshot.css)) {
  const previous = baseline.css[file] ?? {
    important: 0,
    colors: [],
    colorOccurrences: 0,
    unprefixedClasses: [],
  };
  const allowedImportant = importantAllowlist[file]?.maxOccurrences ?? 0;
  if (metrics.important > allowedImportant) {
    violations.push({
      file: path.join(ROOT, file),
      loc: '1:1',
      message: `!important increased to ${metrics.important}; allowed ${allowedImportant}.`,
      hint: 'Use scoped selectors, cascade layers or an explicitly reviewed host override.',
    });
  }

  const newUnprefixed = metrics.unprefixedClasses.filter((name) => !previous.unprefixedClasses.includes(name));
  for (const className of newUnprefixed) {
    violations.push({
      file: path.join(ROOT, file),
      loc: '1:1',
      message: `New unscoped class selector “.${className}”.`,
      hint: 'Use think-* for shared styles or an approved feature prefix.',
    });
  }

  const tokenPaletteFile = file.startsWith('src/styles/tokens/');
  if (!tokenPaletteFile) {
    const newColors = metrics.colors.filter((value) => !previous.colors.includes(value));
    if (metrics.colorOccurrences > previous.colorOccurrences || newColors.length > 0) {
      violations.push({
        file: path.join(ROOT, file),
        loc: '1:1',
        message: `New hardcoded UI color detected${newColors.length ? `: ${newColors.join(', ')}` : '.'}`,
        hint: 'Map the value through a Think OS semantic token. Data colors belong in tokens/data-colors.css.',
      });
    }
  }
}

for (const [file, metrics] of Object.entries(snapshot.scripts)) {
  const previous = baseline.scripts[file] ?? { staticStyle: 0, staticSx: 0 };
  if (metrics.staticStyle > previous.staticStyle) {
    violations.push({
      file: path.join(ROOT, file),
      loc: '1:1',
      message: `Static style={{...}} occurrences increased from ${previous.staticStyle} to ${metrics.staticStyle}.`,
      hint: 'Keep only runtime geometry/data values inline; move fixed skin to CSS.',
    });
  }
  if (metrics.staticSx > previous.staticSx) {
    violations.push({
      file: path.join(ROOT, file),
      loc: '1:1',
      message: `Static sx={{...}} occurrences increased from ${previous.staticSx} to ${metrics.staticSx}.`,
      hint: 'Use shared primitives or semantic class names for fixed visual decisions.',
    });
  }
}

const requiredMainFragments = [
  '@layer think.reset',
  'tokens/semantic.css',
  'tokens/density.css',
  'tokens/data-colors.css',
  'foundations/scope.css',
  'foundations/focus.css',
  'foundations/motion.css',
  'primitives/button.css',
  'primitives/icon-button.css',
  'primitives/form-control.css',
  'primitives/card.css',
  'primitives/chip.css',
  'primitives/toolbar.css',
  'primitives/tabs.css',
  'overrides/mui.css',
  'components/modal.css',
  'components/simple-select.css',
  'components/native-controls.css',
  'components/task-row.css',
  'components/grouped-container.css',
  'features/settings.css',
  'features/settings-editors.css',
  'features/layout-editor.css',
  'features/view-shell.css',
  'features/progress.css',
  'features/heatmap.css',
  'features/statistics.css',
  'features/timeline.css',
  'features/excel.css',
  'features/block.css',
  'features/event-timeline.css',
  'features/task-execution.css',
  'overrides/obsidian-modal.css',
  'overrides/quick-input-modal.css',
];
const mainCssPath = path.join(ROOT, 'src/styles/main.css');
const mainCss = fs.existsSync(mainCssPath) ? fs.readFileSync(mainCssPath, 'utf8') : '';
for (const fragment of requiredMainFragments) {
  if (!mainCss.includes(fragment)) {
    violations.push({ file: mainCssPath, loc: '1:1', message: `CSS entry is missing “${fragment}”.` });
  }
}

const requiredScopeMarkers = [
  ['src/platform/obsidian/SettingsRoot.tsx', 'think-os--settings'],
  ['src/platform/obsidian/SettingsTab.tsx', 'think-os--settings'],
  ['src/features/settings/layout/LayoutRenderer.tsx', 'think-os--layout'],
  ['src/shared/ui/primitives/Modal.tsx', 'think-os--modal'],
];
for (const [file, marker] of requiredScopeMarkers) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!source.includes(marker)) {
    violations.push({ file: full, loc: '1:1', message: `Root scope marker “${marker}” is missing.` });
  }
}

const v2Contracts = [
  ['src/shared/styles/mui-theme.ts', 'createThinkMuiTheme'],
  ['src/shared/styles/mui-theme.ts', 'var(--think-control-height-md'],
  ['src/shared/ui/components/ThinkMuiThemeProvider.tsx', 'MutationObserver'],
  ['src/app/ui/mountWithServices.tsx', 'ThinkMuiThemeProvider'],
  ['src/platform/obsidian/modals/modalPreact.ts', 'ThinkMuiThemeProvider'],
];
for (const [file, contract] of v2Contracts) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!source.includes(contract)) {
    violations.push({ file: full, loc: '1:1', message: `CSS V2 contract “${contract}” is missing.` });
  }
}

const v3Contracts = [
  ['src/features/settings/components/LayoutEditorPanel.tsx', 'think-layout-editor'],
  ['src/features/settings/tabs/GeneralSettings.tsx', 'think-settings-page'],
  ['src/features/settings/tabs/DataManagementSettings.tsx', 'think-settings-page'],
  ['src/features/settings/tabs/AiSettings.tsx', 'think-settings-page'],
  ['src/features/settings/tabs/InputSettings.tsx', 'think-settings-page'],
  ['src/features/settings/views/editors/RuleBuilder.tsx', 'think-rule-builder'],
  ['src/features/settings/input/BlockManager.tsx', 'think-block-editor'],
  ['src/shared/ui/primitives/Modal.tsx', 'ThinkIconButton'],
  ['src/platform/obsidian/modals/CheckinManagerModal.tsx', 'think-checkin-modal-host'],
];
for (const [file, contract] of v3Contracts) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!source.includes(contract)) {
    violations.push({ file: full, loc: '1:1', message: `CSS V3 contract “${contract}” is missing.` });
  }
}


const v4Contracts = [
  ['src/features/settings/views/runtime/ProgressGoalCard.tsx', 'think-progress-card'],
  ['src/features/settings/views/runtime/ProgressView.tsx', 'think-progress-view'],
  ['src/features/settings/layout/ModulePanel.tsx', 'ThinkIconButton'],
  ['src/features/settings/views/runtime/components/heatmap/HeatmapCell.tsx', 'heatmap-cell-image'],
  ['src/features/settings/views/runtime/StatisticsView/StatisticsGoalThemeSummaryStrip.tsx', 'sv-goal-summary-strip'],
];
for (const [file, contract] of v4Contracts) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!source.includes(contract)) {
    violations.push({ file: full, loc: '1:1', message: `CSS V4 contract “${contract}” is missing.` });
  }
}

const legacyCssDir = path.join(ROOT, 'src/shared/styles');
const legacyCssFiles = walk(legacyCssDir, (candidate) => candidate.endsWith('.css'));
for (const file of legacyCssFiles) {
  violations.push({
    file,
    loc: '1:1',
    message: 'CSS V5 forbids legacy styles under src/shared/styles.',
    hint: 'Move the rule into tokens, foundations, primitives, components, features or overrides.',
  });
}
if (mainCss.includes('../shared/styles/')) {
  violations.push({
    file: mainCssPath,
    loc: '1:1',
    message: 'CSS V5 entry still imports a legacy shared stylesheet.',
  });
}

const v5Contracts = [
  ['src/styles/features/task-execution.css', '--think-task-tone-1-bg'],
  ['src/styles/components/task-row.css', 'think-table-cell-item'],
  ['src/styles/components/grouped-container.css', 'bv-group--level-1'],
  ['src/styles/overrides/quick-input-modal.css', 'think-quick-input-keyboard-detected'],
  ['src/features/settings/views/runtime/components/items/TaskRow.tsx', 'task-row-title'],
  ['src/features/settings/views/runtime/TableViewCell.tsx', 'think-table-cell-item'],
  ['src/platform/obsidian/modals/quickInputKeyboard.ts', 'think-quick-input-keyboard-detected'],
];
for (const [file, contract] of v5Contracts) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!source.includes(contract)) {
    violations.push({ file: full, loc: '1:1', message: `CSS V5 contract “${contract}” is missing.` });
  }
}

const finalBudget = {
  cssFiles: 65,
  cssLines: 7300,
  important: 12,
  hardcodedColorsOutsideTokens: 0,
  duplicateClassesAcrossFiles: 90,
  sxOccurrences: 255,
  styleOccurrences: 114,
};
const currentAuditPath = path.join(ROOT, 'reports/css/css-audit-current.json');
if (fs.existsSync(currentAuditPath)) {
  const audit = JSON.parse(fs.readFileSync(currentAuditPath, 'utf8')).summary ?? {};
  for (const [metric, limit] of Object.entries(finalBudget)) {
    if ((audit[metric] ?? Number.POSITIVE_INFINITY) > limit) {
      violations.push({
        file: currentAuditPath,
        loc: '1:1',
        message: `CSS V5 budget exceeded for ${metric}: ${audit[metric]}; allowed ${limit}.`,
      });
    }
  }
}

const settingsScriptMetrics = Object.entries(snapshot.scripts)
  .filter(([file]) => file.startsWith('src/features/settings/'))
  .reduce((total, [, metrics]) => ({
    staticStyle: total.staticStyle + metrics.staticStyle,
    staticSx: total.staticSx + metrics.staticSx,
  }), { staticStyle: 0, staticSx: 0 });
if (settingsScriptMetrics.staticSx > 132) {
  violations.push({
    file: path.join(ROOT, 'src/features/settings'),
    loc: '1:1',
    message: `CSS V3 Settings static sx budget exceeded: ${settingsScriptMetrics.staticSx}; allowed 132.`,
    hint: 'Use Think OS primitives and feature-scoped semantic classes for fixed Settings skin.',
  });
}

const forbiddenLegacySelectors = ['.category-item', '.move-button', '.alias-input', '.display-mode-options'];
for (const file of ['src/shared/styles/settings.css', 'src/shared/styles/statistics.css']) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? stripComments(fs.readFileSync(full, 'utf8')) : '';
  for (const selector of forbiddenLegacySelectors) {
    if (source.includes(selector)) {
      violations.push({
        file: full,
        loc: '1:1',
        message: `Legacy cross-feature selector “${selector}” returned.`,
        hint: 'Keep Settings and Statistics selectors feature-scoped and prefixed.',
      });
    }
  }
}

for (const file of ['src/platform/obsidian/SettingsRoot.tsx', 'src/platform/obsidian/SettingsTab.tsx']) {
  const full = path.join(ROOT, file);
  const source = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (/ThemeProvider\s+theme=\{baseTheme\}/.test(source) || /<CssBaseline/.test(source)) {
    violations.push({
      file: full,
      loc: '1:1',
      message: 'Legacy fixed MUI theme or global CssBaseline returned to a scoped Settings root.',
      hint: 'Use ThinkMuiThemeProvider and scoped Think OS foundations.',
    });
  }
}

if (violations.length > 0) {
  failWithViolations(RULE_ID, violations, {
    rootDir: ROOT,
    summary: 'CSS governance prevents new unscoped selectors, hardcoded UI skin and legacy-style growth.',
  });
}

printOk(RULE_ID, 'CSS V5 final architecture, budgets and legacy-removal contracts remain within governance.');
