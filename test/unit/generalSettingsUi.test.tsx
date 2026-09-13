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
    setRecordTypeColor: jest.fn(async () => {}),
  },
};
const mockState: any = { settings: { floatingTimerEnabled: true, devConsoleStackEnabled: false, recordTypeColors: { task: '#123456' } } };

jest.mock('@/app/public', () => ({
  selectFloatingTimerEnabled: (state: any) => state.settings.floatingTimerEnabled,
  selectDevConsoleStackEnabled: (state: any) => state.settings.devConsoleStackEnabled,
  selectRecordTypeColors: (state: any) => state.settings.recordTypeColors,
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
    await act(async () => { checkbox.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(mockUseCases.settings.setFloatingTimerEnabled).toHaveBeenCalledWith(false);
  });

  it('1.6.0 固定渲染 10 种用户记录类型颜色，并且不恢复旧分类颜色编辑器', async () => {
    await act(async () => render(<GeneralSettings />, host));
    const section = host.querySelector('[data-settings-section="record-type-colors"]')!;
    expect(section.querySelectorAll('.think-settings-record-type-color-row')).toHaveLength(10);
    expect(section.textContent).toContain('任务');
    expect(section.textContent).toContain('里程碑');
    expect(section.textContent).not.toContain('任务工作块');
    expect(section.textContent).not.toContain('任务系列');
    expect(host.textContent).not.toContain('分类颜色');
    expect((section.querySelector('input[aria-label="任务颜色"]') as HTMLInputElement).value).toBe('#123456');
  });

  it('修改任务颜色与恢复默认只走 SettingsUseCase', async () => {
    await act(async () => render(<GeneralSettings />, host));
    const picker = host.querySelector('input[aria-label="任务颜色"]') as HTMLInputElement;
    picker.value = '#abcdef';
    await act(async () => picker.dispatchEvent(new Event('input', { bubbles: true })));
    expect(mockUseCases.settings.setRecordTypeColor).toHaveBeenCalledWith('task', '#abcdef');

    const taskRow = picker.closest('.think-settings-record-type-color-row')!;
    const reset = [...taskRow.querySelectorAll('button')].find((button) => button.textContent?.includes('恢复默认')) as HTMLButtonElement;
    await act(async () => reset.click());
    expect(mockUseCases.settings.setRecordTypeColor).toHaveBeenCalledWith('task', null);
  });
});
