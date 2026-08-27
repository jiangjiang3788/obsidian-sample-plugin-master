/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F073/ui
 * @covers F073/unit
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import { AiBatchConfirmFooter } from '@/platform/obsidian/modals/AiBatchConfirmFooter';

describe('AiBatchConfirmFooter action wiring', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('uses one native click path for save instead of pointer/mouse dual submission', () => {
    const onSave = jest.fn();

    render(
      <AiBatchConfirmFooter
        saved={false}
        skipped={false}
        isBusy={false}
        isSavingCurrent={false}
        actionStatus={{ tone: 'idle', message: '' }}
        onSkip={jest.fn()}
        onSave={onSave}
        onComplete={jest.fn()}
      />,
      host,
    );

    const saveButton = host.querySelector('[data-ai-batch-action="save-current"]') as HTMLButtonElement;
    expect(saveButton).toBeTruthy();

    saveButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(onSave).not.toHaveBeenCalled();

    saveButton.click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows immediate transaction feedback and disables save while busy', () => {
    render(
      <AiBatchConfirmFooter
        saved={false}
        skipped={false}
        isBusy={true}
        isSavingCurrent={true}
        actionStatus={{ tone: 'working', message: '正在保存第 1 条…' }}
        onSkip={jest.fn()}
        onSave={jest.fn()}
        onComplete={jest.fn()}
      />,
      host,
    );

    const saveButton = host.querySelector('[data-ai-batch-action="save-current"]') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
    expect(host.textContent).toContain('正在保存第 1 条…');
    expect(host.querySelector('[role="status"]')).toBeTruthy();
  });
});
