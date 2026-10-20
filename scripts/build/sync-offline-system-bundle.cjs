'use strict';
/**
 * EMERGENCY OFFLINE bridge only. Do NOT use as the regular release pipeline.
 * The proper release is `npm ci && npm run build:release` (Vite owns bundling).
 * This runner synchronizes the few changed, self-contained TS functions into
 * the prebuilt main.js when npm's registry is unavailable. Changes are sourced
 * from TypeScript, not independently hand-written JS patches.
 * It intentionally removes the invalidated source map.
 */
const fs = require('node:fs');
const path = require('node:path');
let ts;
try { ts = require('typescript'); }
catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root = path.resolve(__dirname, '..', '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const bundlePath = path.join(root, 'main.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');

function compiledSource(file, jsx = false) {
  const raw = source(file);
  const result = ts.transpileModule(raw, {
    fileName: file, reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'u2', jsxFragmentFactory: 'S',
    },
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw Error(`${file}: ${errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n')}`);
  return result.outputText;
}

function astStatements(sourceText, fileName) {
  const ast = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (ast.parseDiagnostics?.length) throw Error(`JS parse error: ${fileName}`);
  return { ast, statements: ast.statements };
}
function findDeclaration(sourceText, name, fileName) {
  const { ast, statements } = astStatements(sourceText, fileName);
  const matches = statements.filter((node) =>
    (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name?.text === name
    || ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => d.name.getText(ast) === name));
  if (matches.length !== 1) throw Error(`Expected one declaration for ${name}, found ${matches.length} in ${fileName}`);
  const node = matches[0];
  return { text: sourceText.slice(node.getStart(ast), node.end).replace(/^export\s+/, ''), start: node.getStart(ast), end: node.end };
}
function replaceFunctionFromSource(functionName, file, jsx = false, hookAliases = false) {
  let compiled = findDeclaration(compiledSource(file, jsx), functionName, file).text;
  if (jsx) compiled = compiled.replace(/\b_jsxs?\b/g, 'u2').replace(/\b_Fragment\b/g, 'S');
  if (hookAliases) {
    compiled = compiled.replace(/\buseRef\b/g, 'A$1')
      .replace(/\buseState\b/g, 'd')
      .replace(/\buseEffect\b/g, 'y')
      .replace(/\buseCallback\b/g, 'q$1');
  }
  const original = findDeclaration(bundle, functionName, 'main.js');
  bundle = bundle.slice(0, original.start) + compiled + bundle.slice(original.end);
  return compiled.length;
}
function standalone(name, file, hookAliases = false) {
  let compiled = findDeclaration(compiledSource(file), name, file).text;
  if (hookAliases) compiled = compiled.replace(/\buseRef\b/g, 'A$1').replace(/\buseEffect\b/g, 'y');
  return compiled;
}

// Keep the existing bundled helper name but back it with the canonical core constant.
replaceFunctionFromSource('timelineKeyHour', 'src/core/utils/timelineScale.ts');
const oldLoop = 'for (const minute of [180, 360, 540, 720]) {';
if (bundle.includes(oldLoop)) bundle = bundle.replace(oldLoop, 'for (const minute of TIMELINE_KEY_HOURS.map((hour) => hour * 60)) {');
else if (!bundle.includes('for (const minute of TIMELINE_KEY_HOURS.map((hour) => hour * 60))')) throw Error('Key-hour loop missing');
const keyHours = standalone('TIMELINE_KEY_HOURS', 'src/core/utils/timelineScale.ts');
const rulerMarker = 'function timelineKeyHour(minute) {';
if (bundle.split(rulerMarker).length !== 2) throw Error('Missing bundled key-hour helper');
if (!bundle.includes('const TIMELINE_KEY_HOURS =')) bundle = bundle.replace(rulerMarker, keyHours + '\n' + rulerMarker);

replaceFunctionFromSource('useTimelineZoom', 'src/core/hooks/useTimelineZoom.ts', false, true);
replaceFunctionFromSource('TimelineTaskBlock', 'src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx', true, true);
replaceFunctionFromSource('DayColumnBody', 'src/features/views/runtime/components/timeline/DayColumnBody.tsx', true, true);

// A shared, side-effect-contained state machine; inject once and let both
// runtime components call exactly this one implementation.
const gestureFile = 'src/shared/ui/timeline/TimelineTouchGesture.ts';
const gestureFunctions = ['TIMELINE_TOUCH_POLICY', 'TimelineTouchGesture', 'findTimelineTouch']
  .map((name) => standalone(name, gestureFile));
const hook = standalone('useTimelineTouchGesture', 'src/shared/ui/timeline/useTimelineTouchGesture.ts', true);
if (!bundle.includes('function TimelineTaskBlock(')) throw Error('No TimelineTaskBlock insertion point');
if (!bundle.includes('class TimelineTouchGesture {')) bundle = bundle.replace('function TimelineTaskBlock(', [...gestureFunctions, hook].join('\n') + '\nfunction TimelineTaskBlock(');

// Repository updater is internally cohesive; synchronize the entire source
// module (rather than maintaining a second hand-edited download protocol).
let updater = compiledSource('src/platform/obsidian/GitHubDevUpdater.ts')
  .replace(/^import\s*\{[^\n]+\}\s*from\s*['"]obsidian['"];?\s*\n/m, '')
  .replace(/\brequestUrl\b/g, 'obsidian.requestUrl')
  .replace(/\bnormalizePath\b/g, 'obsidian.normalizePath')
  .replace(/\bexport\s+/g, '');
const startGithub = bundle.indexOf('const GITHUB_OWNER =');
const endGithub = bundle.indexOf('const THINK_SETTINGS_VIEW_TYPE =', startGithub);
if (startGithub === -1 || endGithub === -1) throw Error('Updater bundle boundary missing');
bundle = bundle.slice(0, startGithub) + updater.trim() + '\n' + bundle.slice(endGithub);

let control = compiledSource('src/features/settings/components/DevBuildUpdateControl.tsx', true)
  .replace(/^import[^\n]*;?\s*\n/gm, '')
  .replace(/\b_jsxs?\b/g, 'u2')
  .replace(/\b_Fragment\b/g, 'S')
  .replace(/\bexport\s+/g, '')
  .replace(/\buseState\b/g, 'd')
  .replace(/\buseEffect\b/g, 'y');
const startControl = bundle.indexOf('function formatGitHubCommitTime(');
const endControl = bundle.indexOf('function SettingsNavigation(', startControl);
if (startControl === -1 || endControl === -1) throw Error('Settings control bundle boundary missing');
bundle = bundle.slice(0, startControl) + control.trim() + '\n' + bundle.slice(endControl);

bundle = bundle.replace(/\n\/\/# sourceMappingURL=main\.js\.map\s*$/, '\n');
fs.writeFileSync(bundlePath, bundle);
fs.rmSync(path.join(root, 'main.js.map'), { force: true });

// CSS is concatenated source order; update the single feature-owned chunk.
let css = source('styles.css');
const cssStart = css.indexOf('/* Timeline visualization. Geometry stays feature-owned; typography, guides,');
const cssEnd = css.indexOf('/* Timeline Goal time-budget / balance presentation.', cssStart);
if (cssStart === -1 || cssEnd === -1) throw Error('CSS bundle timeline feature boundary missing');
const timelineCSS = source('src/styles/features/timeline.css').trimEnd();
css = css.slice(0, cssStart) + timelineCSS + '\n\n' + css.slice(cssEnd);
fs.writeFileSync(path.join(root, 'styles.css'), css);

// Fail before packaging if the JS syntax or manifest's required artifacts drift.
new (require('node:vm').Script)(bundle, { filename: 'main.js' });
if (!bundle.includes('function useTimelineTouchGesture(') || !bundle.includes('githubPushedAt')) {
  throw Error('Missing synchronized architecture in main.js');
}
console.log('Offline synchronized source modules into main.js and styles.css (NOT a Vite release build).');
