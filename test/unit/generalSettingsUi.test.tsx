/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F110/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

const mockUseCases = {
  settings: {
    setFloatingTimerEnabled: jest.fn(async () => {}),
    setDevConsoleStackEnabled: jest.fn(async () => {}),
    updateCategoryColors: jest.fn(async () => {}),
  },
};
const mockState: any = { settings: { floatingTimerEnabled: true, devConsoleStackEnabled: false, categoryColors: { 工作: '#123456' } } };

jest.mock('@/app/public', () => ({
  selectFloatingTimerEnabled: (state: any) => state.settings.floatingTimerEnabled,
  selectDevConsoleStackEnabled: (state: any) => state.settings.devConsoleStackEnabled,
  selectCategoryColors: (state: any) => state.settings.categoryColors,
  useSelector: (selector: any) => selector(mockState),
  useUseCases: () => mockUseCases,
}));

import { GeneralSettings } from '@/features/settings/tabs/GeneralSettings';

describe('通用设置界面', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    Object.values(mockUseCases.settings).forEach((fn: any) => fn.mockClear());
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(() => { render(null, host); host.remove(); });

  it('切换悬浮计时器会调用唯一设置用例', async () => {
    await act(async () => render(<GeneralSettings />, host));
    const row = [...host.querySelectorAll('.think-settings-row')].find((node) => node.textContent?.includes('悬浮计时器'))!;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = false;
    await act(async () => checkbox.dispatchEvent(new Event('change', { bubbles: true })));
    expect(mockUseCases.settings.setFloatingTimerEnabled).toHaveBeenCalledWith(false);
  });

  it('新增分类颜色会提交现有颜色与新增颜色的完整映射', async () => {
    await act(async () => render(<GeneralSettings />, host));
    const nameInput = host.querySelector('input[placeholder="新分类名称"]') as HTMLInputElement;
    nameInput.value = '学习';
    await act(async () => nameInput.dispatchEvent(new Event('input', { bubbles: true })));
    const add = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '添加') as HTMLButtonElement;
    await act(async () => add.click());
    expect(mockUseCases.settings.updateCategoryColors).toHaveBeenCalledWith(expect.objectContaining({ 工作: '#123456', 学习: '#cccccc' }));
  });
});
