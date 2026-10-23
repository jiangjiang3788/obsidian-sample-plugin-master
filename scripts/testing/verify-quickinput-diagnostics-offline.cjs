/** Dependency-free regression smoke check for environments without npm packages. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const changedSources = [
  'src/features/quickinput/editor/fields/inputEvents.ts',
  'src/features/quickinput/editor/fields/TextFieldRenderer.tsx',
  'src/features/quickinput/editor/QuickInputEditorContainer.tsx',
  'src/features/quickinput/modal/QuickInputModalContent.tsx',
  'src/features/quickinput/modal/useQuickInputSubmit.ts',
  'src/platform/obsidian/modals/quickInputKeyboard.ts',
  'src/platform/obsidian/modals/QuickInputModal.tsx',
  'src/platform/obsidian/ThinkDiagnostics.ts',
  'src/platform/obsidian/ThinkSettingsView.tsx',
  'src/platform/obsidian/ThinkWhiteboardView.tsx',
  'src/main.ts',
];
const output = new Map();
for (const file of changedSources) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, jsxImportSource: 'preact' },
  });
  const errors = (transpiled.diagnostics || []).filter((issue) => issue.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map((e) => e.messageText).join('; ')}`);
  output.set(file, transpiled.outputText);
}

class FakeElement {
  constructor(tagName = 'DIV', parent = null, classNames = []) {
    this.tagName = tagName;
    this.parent = parent;
    this.classNames = classNames;
  }
  contains(el) { while (el) { if (el === this) return true; el = el.parent; } return false; }
  closest(selector) {
    if (/button|input|textarea|select|\[role=|\[contenteditable|label|summary|\[tabindex/.test(selector)) {
      let node = this;
      while (node) {
        if (['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) return node;
        node = node.parent;
      }
    }
    if (selector.includes('think-')) {
      let node = this;
      while (node) {
        if (node.classNames.some((cls) => selector.includes(cls))) return node;
        node = node.parent;
      }
    }
    return null;
  }
  matches(selector) { return this.classNames.some((cls) => selector.includes(cls)); }
  get classList() { return this.classNames; }
}
const writes = new Map();
const fakeAdapter = {
  stat: async (p) => writes.has(p) ? { size: writes.get(p).length } : null,
  exists: async (p) => writes.has(p),
  read: async (p) => writes.get(p) || '',
  write: async (p, value) => { writes.set(p, value); },
  append: async (p, value) => { writes.set(p, (writes.get(p) || '') + value); },
  rename: async (from, to) => { writes.set(to, writes.get(from)); writes.delete(from); },
  remove: async (p) => { writes.delete(p); },
};
const context = {
  exports: {},
  module: { exports: {} },
  require: (id) => id === 'obsidian' ? { Notice: class Notice {} } : (() => { throw new Error(`Unexpected import: ${id}`); })(),
  Element: FakeElement,
  HTMLElement: FakeElement,
  HTMLTextAreaElement: FakeElement,
  navigator: { userAgent: 'Android', maxTouchPoints: 1 },
  document: { addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, visibilityState: 'visible' },
  window: { setInterval() { return 1; }, clearInterval() {} },
  performance: { now: () => 100 },
  Date, Math, Map, Set, Array, JSON, console,
};
function load(filename) {
  const sandbox = { ...context, exports: {}, module: { exports: {} } };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(output.get(filename), sandbox, { filename });
  return sandbox.module.exports;
}

const { readLatestQuickInputTextFields } = load('src/features/quickinput/editor/fields/inputEvents.ts');
const native = { value: 'final dictated paragraph', getAttribute: () => 'body' };
const current = { body: 'old', goalPath: 'stable' };
const resolved = readLatestQuickInputTextFields({ querySelectorAll: () => [native] }, current);
assert.equal(resolved.formData.body, 'final dictated paragraph');
assert.equal(resolved.formData.goalPath, 'stable');
assert.equal(current.body, 'old');
assert.equal(resolved.changedKeys[0], 'body');
const multi = readLatestQuickInputTextFields({ querySelectorAll: () => [{ value: 'a\nb', getAttribute: () => 'tags' }] }, { tags: ['a', 'b'] });
assert.equal(multi.changedKeys.length, 0);

const { shouldDismissQuickInputKeyboard } = load('src/platform/obsidian/modals/quickInputKeyboard.ts');
const host = new FakeElement();
const field = new FakeElement('TEXTAREA', host);
const blank = new FakeElement('DIV', host);
const button = new FakeElement('BUTTON', host);
assert.equal(shouldDismissQuickInputKeyboard(blank, field, host), true);
assert.equal(shouldDismissQuickInputKeyboard(button, field, host), false);
assert.equal(shouldDismissQuickInputKeyboard(field, field, host), false);
assert.equal(shouldDismissQuickInputKeyboard(new FakeElement(), field, host), false);

const { ThinkDiagnostics, summarizeThinkLatency, describeThinkControl } = load('src/platform/obsidian/ThinkDiagnostics.ts');
const report = summarizeThinkLatency([
  { kind: 'response', surface: 'quickinput', action: 'save', durationMs: 50 },
  { kind: 'response', surface: 'quickinput', action: 'save', durationMs: 250 },
]);
assert.equal(report[0].p95Ms, 250);
const secretButton = new FakeElement('BUTTON', host, ['think-save-control']);
assert.equal(describeThinkControl(secretButton), 'button.think-save-control');
const plugin = {
  manifest: { id: 'think-os', dir: '.obsidian/plugins/think-os' },
  app: { vault: { configDir: '.obsidian', adapter: fakeAdapter }, workspace: { on: () => ({}) } },
  registerEvent() {},
};
const diagnostics = new ThinkDiagnostics(plugin);
diagnostics.start();
diagnostics.record('interaction', 'quickinput', 'input:textarea.think-qif-textarea');
diagnostics.flush().then(() => {
  const serialized = [...writes.values()].join('\n');
  assert.match(serialized, /android/);
  assert.match(serialized, /quickinput/);
  assert.doesNotMatch(serialized, /final dictated paragraph/);
  diagnostics.stop();
  console.log(`PASS: syntax of ${changedSources.length} modified files; IME snapshot, blank-tap predicate, response p95, safe Android disk logging`);
}).catch((error) => { console.error(error); process.exitCode = 1; });
