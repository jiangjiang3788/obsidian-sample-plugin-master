/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F044/ui
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { QuickInputConflictRecoveryPanel } from '@/features/quickinput/modal/QuickInputConflictRecoveryPanel';

const recovery = {
  shouldShow: true,
  title: '保存遇到记录冲突',
  message: '原记录位置已变化',
  advice: '请重新扫描后重试',
  paths: ['Daily.md', 'Archive.md'],
  canOpenOriginal: true,
  canRescan: true,
  canRetry: true,
};

describe('QuickInputConflictRecoveryPanel', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('冲突时明确展示路径与四个恢复动作，并把点击交给上层恢复流程', async () => {
    const onOpenOriginal = jest.fn();
    const onRescan = jest.fn();
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    await act(async () => {
      render(<QuickInputConflictRecoveryPanel
        recovery={recovery}
        isBusy={false}
        isRescanning={false}
        onOpenOriginal={onOpenOriginal}
        onRescan={onRescan}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />, host);
    });

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('原记录位置已变化');
    expect(host.textContent).toContain('Daily.md、Archive.md');
    const buttons = [...host.querySelectorAll('button')];
    const click = async (text: string) => {
      const button = buttons.find((node) => node.textContent?.includes(text)) as HTMLButtonElement;
      expect(button).toBeTruthy();
      await act(async () => { button.click(); });
    };
    await click('打开原文');
    await click('重新扫描');
    await click('重试保存');
    await click('隐藏');
    expect(onOpenOriginal).toHaveBeenCalledTimes(1);
    expect(onRescan).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('忙碌或扫描中时禁用恢复按钮，避免重复写入和重复扫描', async () => {
    await act(async () => {
      render(<QuickInputConflictRecoveryPanel
        recovery={recovery}
        isBusy={false}
        isRescanning={true}
        onOpenOriginal={jest.fn()}
        onRescan={jest.fn()}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />, host);
    });
    const buttons = [...host.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.length).toBe(4);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(host.textContent).toContain('扫描中…');
  });
});
