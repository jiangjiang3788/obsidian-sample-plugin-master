import {
  readLatestQuickInputTextFields,
  rememberQuickInputRenderedValue,
  shouldCommitQuickInputPassiveValue,
} from '@/features/quickinput/editor/fields/inputEvents';
import { setupQuickInputKeyboardDetection, shouldDismissQuickInputKeyboard } from '@/platform/obsidian/modals/quickInputKeyboard';

describe('Quick Input mobile IME consistency', () => {
  it('reconciles dictation text that exists in DOM before the final input event', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="内容"></textarea>';
    const textarea = root.querySelector('textarea')!;
    textarea.value = '一整段尚未发出 input 事件的语音输入';
    const original = { 内容: '旧文本', '目标': '当前目标' };
    const snapshot = readLatestQuickInputTextFields(root, original);
    expect(snapshot.formData['内容']).toBe(textarea.value);
    expect(snapshot.formData['目标']).toBe('当前目标');
    expect(original['内容']).toBe('旧文本');
    expect(snapshot.changedKeys).toEqual(['内容']);
  });

  it('does not rewrite unchanged multi-value fields or hidden controls', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="多选"></textarea>';
    root.querySelector('textarea')!.value = '一\n二';
    const original = { 多选: ['一', '二'], 私人记录: '不动' };
    expect(readLatestQuickInputTextFields(root, original)).toEqual({ formData: original, changedKeys: [] });
  });

  it('does not let an unpainted blank control erase a freshly selected Goal template default', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="任务内容"></textarea>';
    const original = { 任务内容: '模板预设正文' };
    const snapshot = readLatestQuickInputTextFields(root, original, { 任务内容: 'template_default' });
    expect(snapshot.formData).toBe(original);
    expect(snapshot.changedKeys).toEqual([]);

    const edited = readLatestQuickInputTextFields(root, original, { 任务内容: 'user' });
    expect(edited.formData.任务内容).toBe('');
    expect(edited.changedKeys).toEqual(['任务内容']);

    // Timeline invocation times use source=context instead of template_default.
    // The first Save must not turn an unpainted datetime field into ''.
    const execution = readLatestQuickInputTextFields(root, { 任务内容: '2026-05-13T01:20' }, { 任务内容: 'context' });
    expect(execution.changedKeys).toEqual([]);
  });

  it('first Goal selection + immediate Save does not overwrite the default from a still-focused blank input', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="任务内容"></textarea>';
    document.body.appendChild(root);
    try {
      const textarea = root.querySelector('textarea')!;
      rememberQuickInputRenderedValue(textarea, '');
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
      const draft = { 任务内容: '模板预设正文' };
      const result = readLatestQuickInputTextFields(root, draft, { 任务内容: 'template_default' });
      expect(result.formData).toBe(draft);
      expect(result.changedKeys).toEqual([]);
      // A delayed blur/change from the old control must not undo hydration.
      expect(shouldCommitQuickInputPassiveValue({ currentTarget: textarea } as unknown as Event)).toBe(false);
    } finally {
      root.remove();
    }
  });

  it('a previous nonempty Goal default is not mistaken for a user edit when another Goal is saved immediately', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="任务内容">旧 Goal 默认</textarea>';
    const textarea = root.querySelector('textarea')!;
    textarea.value = '旧 Goal 默认';
    rememberQuickInputRenderedValue(textarea, '旧 Goal 默认');
    const nextDraft = { 任务内容: '新 Goal 默认' };
    const snapshot = readLatestQuickInputTextFields(root, nextDraft, { 任务内容: 'template_default' });
    expect(snapshot.formData).toBe(nextDraft);
    expect(snapshot.changedKeys).toEqual([]);
    expect(shouldCommitQuickInputPassiveValue({ currentTarget: textarea } as unknown as Event)).toBe(false);
  });

  it('a user clear and a delayed native dictation edit remain authoritative over defaults', () => {
    const root = document.createElement('div');
    root.innerHTML = '<textarea data-quick-input-field-key="任务内容"></textarea>';
    const textarea = root.querySelector('textarea')!;
    rememberQuickInputRenderedValue(textarea, '模板预设正文');

    // Real deletion changes the DOM away from the value the UI last painted,
    // so even a delayed native change is accepted instead of losing user intent.
    textarea.value = '';
    expect(shouldCommitQuickInputPassiveValue({ currentTarget: textarea } as unknown as Event)).toBe(true);
    const cleared = readLatestQuickInputTextFields(root, { 任务内容: '模板预设正文' }, { 任务内容: 'user' });
    expect(cleared.formData.任务内容).toBe('');
    expect(cleared.changedKeys).toEqual(['任务内容']);

    textarea.value = '语音输入的新内容';
    const edited = readLatestQuickInputTextFields(root, { 任务内容: '模板预设正文' }, { 任务内容: 'template_default' });
    expect(edited.formData.任务内容).toBe('语音输入的新内容');
    expect(edited.changedKeys).toEqual(['任务内容']);
  });

  it('only allows keyboard dismissal on blank space inside current modal', () => {
    const modal = document.createElement('div');
    const editor = document.createElement('div');
    const field = document.createElement('textarea');
    const blank = document.createElement('div');
    const button = document.createElement('button');
    editor.append(field, blank, button);
    modal.appendChild(editor);
    expect(shouldDismissQuickInputKeyboard(blank, field, modal)).toBe(true);
    expect(shouldDismissQuickInputKeyboard(field, field, modal)).toBe(false);
    expect(shouldDismissQuickInputKeyboard(button, field, modal)).toBe(false);
    expect(shouldDismissQuickInputKeyboard(document.body, field, modal)).toBe(false);
  });

  it('actually blurs a focused text field without closing or clearing its text', () => {
    const modal = document.createElement('div');
    const content = document.createElement('div');
    const field = document.createElement('textarea');
    const blank = document.createElement('div');
    content.className = 'think-modal__body';
    field.value = '不能丢失的语音输入';
    content.append(field, blank);
    modal.append(content);
    document.body.append(modal);
    const cleanup = setupQuickInputKeyboardDetection({ modalEl: modal, contentEl: content });
    try {
      field.focus();
      blank.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(document.activeElement).not.toBe(field);
      expect(field.value).toBe('不能丢失的语音输入');
      expect(modal.isConnected).toBe(true);
    } finally {
      cleanup();
      modal.remove();
    }
  });
});
