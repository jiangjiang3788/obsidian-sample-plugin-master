/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F102/ui
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import {
  LayoutFreeformSettings,
  LayoutGeneralSettings,
} from '@/features/settings/components/LayoutEditorControls';
import type { Layout } from '@core/types/public';

function makeLayout(overrides: Partial<Layout> = {}): Layout {
  return {
    id: 'layout-v6',
    name: 'V6 布局',
    parentId: null,
    viewInstanceIds: ['view-a', 'view-b'],
    displayMode: 'freeform',
    initialView: '月',
    initialDateFollowsNow: true,
    freeformConfig: { defaultTemplate: 'balanced', snapToGrid: true, gridSize: 16 },
    viewPlacements: {
      'view-a': { x: 0, y: 0, width: 320, height: 220 },
    },
    ...overrides,
  } as Layout;
}

function fireInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('布局编辑控件界面交互', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
    jest.restoreAllMocks();
  });

  it('布局名称、工具栏和自由布局数值通过用户输入产生规范化更新', () => {
    const onUpdate = jest.fn();
    render(<LayoutGeneralSettings layout={makeLayout()} onUpdate={onUpdate} />, host);

    const name = host.querySelector('input[aria-label="布局名称"]') as HTMLInputElement;
    fireInput(name, '新的布局名称');
    expect(onUpdate).toHaveBeenCalledWith({ name: '新的布局名称' });

    render(
      <LayoutFreeformSettings
        layout={makeLayout({ viewPlacements: {} })}
        onUpdate={onUpdate}
        onResetFreeformLayout={jest.fn()}
      />,
      host,
    );
    const gridSize = host.querySelector('input[aria-label="网格大小"]') as HTMLInputElement;
    fireInput(gridSize, '2');
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      freeformConfig: expect.objectContaining({ gridSize: 4 }),
    }));
  });

  it('已有自由布局位置时切换模板必须二次确认，取消后不能清空用户位置', () => {
    const onUpdate = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <LayoutFreeformSettings
        layout={makeLayout()}
        onUpdate={onUpdate}
        onResetFreeformLayout={jest.fn()}
      />,
      host,
    );

    const focus = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('焦点 + 网格')) as HTMLButtonElement;
    expect(focus).toBeTruthy();
    focus.click();
    expect(confirmSpy).toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    focus.click();
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      freeformConfig: expect.objectContaining({ defaultTemplate: 'focus' }),
      viewPlacements: {},
    }));
  });

  it('按模板重排只有在用户确认后才触发重置动作', () => {
    const onReset = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LayoutFreeformSettings layout={makeLayout()} onUpdate={jest.fn()} onResetFreeformLayout={onReset} />, host);

    const reset = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('按模板重排')) as HTMLButtonElement;
    reset.click();
    expect(onReset).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    reset.click();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
