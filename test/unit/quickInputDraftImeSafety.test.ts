import { readLatestQuickInputTextFields } from '@/features/quickinput/editor/fields/inputEvents';
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
