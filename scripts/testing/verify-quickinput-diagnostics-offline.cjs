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
  'src/platform/obsidian/ObsidianVaultPort.ts',
  'src/platform/obsidian/ObsidianAiHttpTransport.ts',
  'src/platform/obsidian/GitHubDevUpdater.ts',
  'src/platform/obsidian/modals/modalPreact.ts',
  'src/platform/obsidian/modals/CheckinManagerModal.tsx',
  'src/platform/obsidian/modals/AiTextPromptModal.tsx',
  'src/platform/obsidian/modals/NamePromptModal.tsx',
  'src/platform/obsidian/modals/AiBatchConfirmModal.tsx',
  'src/platform/obsidian/modals/AiChatModal.tsx',
  'src/platform/obsidian/SettingsTab.tsx',
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
    this.parentElement = parent;
    this.classNames = classNames;
  }
  contains(el) { while (el) { if (el === this) return true; el = el.parent; } return false; }
  closest(selector) {
    const options = selector.split(',').map((token) => token.trim());
    let node = this;
    while (node) {
      if (options.some((token) => token.startsWith('.')
        ? node.classNames.includes(token.slice(1))
        : token.toLowerCase() === node.tagName.toLowerCase())) return node;
      node = node.parent;
    }
    return null;
  }
  matches(selector) { return selector.split(',').some((token) => token.trim().startsWith('.') && this.classNames.includes(token.trim().slice(1))); }
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
  mkdir: async (p) => { writes.set(p, ''); },
};
const context = {
  exports: {},
  module: { exports: {} },
  require: (id) => id === 'obsidian' ? { Notice: class Notice {} } : id === '@shared/utils/public' ? { diagnosticWarn() {} } : (() => { throw new Error(`Unexpected import: ${id}`); })(),
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

const { ThinkDiagnostics, summarizeThinkLatency, describeThinkControl, getThinkSurface, traceThinkOperation } = load('src/platform/obsidian/ThinkDiagnostics.ts');
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
const otherPlugin = new FakeElement('BUTTON', null, ['other-plugin']);
assert.equal(getThinkSurface(otherPlugin), null);
for (const [cls, expected] of [
  ['think-ai-chat-modal', 'ai-chat'],
  ['think-ai-batch-confirm-modal', 'ai-batch'],
  ['think-ai-prompt-modal', 'ai-prompt'],
  ['think-checkin-modal-host', 'checkin'],
  ['think-name-prompt-modal', 'name-prompt'],
  ['think-quick-input-modal', 'quickinput'],
]) {
  const root = new FakeElement('DIV', null, ['think-os', cls]);
  const child = new FakeElement('BUTTON', root, ['think-test-button']);
  assert.equal(getThinkSurface(child), expected);
}
const dashboard = new FakeElement('DIV', null, ['think-os', 'think-os--layout']);
const secretInput = new FakeElement('TEXTAREA', dashboard, ['think-qif-textarea']);
secretInput.value = '不可以泄露的语音秘密';
diagnostics.onInteraction({ type: 'input', target: secretInput });
diagnostics.onInteraction({ type: 'input', target: secretInput }); // sampled, not every letter
diagnostics.record('interaction', 'quickinput', 'input:textarea.think-qif-textarea');
Promise.resolve().then(async () => {
  const result = await traceThinkOperation('vault.write', () => Promise.resolve('ok'), 'storage');
  assert.equal(result, 'ok');
  await assert.rejects(() => traceThinkOperation('ai.request', () => Promise.reject(new Error('private.url/secret')), 'ai'));
  diagnostics.record('lifecycle', 'plugin', 'lag.mark');
  await diagnostics.flush();
  const path = '.obsidian/plugins/think-os/think-os-performance-android.jsonl';
  const contents = writes.get(path);
  assert.match(contents, /android/);
  assert.match(contents, /vault.write/);
  assert.match(contents, /"outcome":"failure"/);
  assert.equal(contents.match(/input:textarea.think-qif-textarea/g).length, 2); // sampled + explicit
  assert.doesNotMatch(contents, /不可以泄露的语音秘密|private\.url|final dictated paragraph/);
  const reportPath = await diagnostics.exportReport();
  assert.match(reportPath, /Think\/diagnostics\/think-os/);
  const report = writes.get(reportPath);
  assert.match(report, /手动标记的卡顿/);
  assert.match(report, /业务操作耗时/);
  assert.match(report, /失败操作/);
  assert.doesNotMatch(report, /不可以泄露的语音秘密|private\.url/);
  diagnostics.stop();
  console.log(`PASS: syntax of ${changedSources.length} modified files; IME, all modal surfaces, input sampling, async outcomes, lag report, content-free Android log`);
}).catch((error) => { console.error(error); process.exitCode = 1; });
