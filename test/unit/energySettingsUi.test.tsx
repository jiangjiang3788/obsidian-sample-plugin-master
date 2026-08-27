/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F113/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

const mockSetEnergyDefaultGoalPath = jest.fn(async () => {});
const mockState: any = {
  settings: {
    energySettings: { defaultGoalPath: '健康/运动' },
    goalSettings: {
      goals: [
        { path: '健康', status: 'active' },
        { path: '健康/运动', status: 'active' },
        { path: '旧目标', status: 'archived' },
      ],
      goalTemplates: [],
    },
  },
};

jest.mock('@/app/public', () => ({
  selectSettings: (state: any) => state.settings,
  selectEnergyDefaultGoalPath: (state: any) => state.settings.energySettings?.defaultGoalPath ?? '',
  useSelector: (selector: any) => selector(mockState),
  useUseCases: () => ({ settings: { setEnergyDefaultGoalPath: mockSetEnergyDefaultGoalPath } }),
}));

import { EnergyRecordTypeSettings } from '@/features/settings/input/EnergyRecordTypeSettings';

describe('精力记录默认目标设置界面', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    mockSetEnergyDefaultGoalPath.mockClear();
    mockState.settings.energySettings.defaultGoalPath = '健康/运动';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('只展示未归档目标，并把用户选择交给唯一设置用例', async () => {
    await act(async () => render(<EnergyRecordTypeSettings />, host));
    const trigger = host.querySelector('[role="combobox"]') as HTMLElement;
    expect(trigger.textContent).toContain('健康/运动');

    await act(async () => trigger.click());
    const optionTexts = [...host.querySelectorAll('[role="option"]')].map((node) => node.textContent?.trim());
    expect(optionTexts).toEqual(expect.arrayContaining(['自动选择第一个活跃目标', '健康', '健康/运动']));
    expect(optionTexts).not.toContain('旧目标');

    const health = [...host.querySelectorAll('[role="option"]')].find((node) => node.textContent?.trim() === '健康') as HTMLElement;
    await act(async () => health.click());
    expect(mockSetEnergyDefaultGoalPath).toHaveBeenCalledWith('健康');
  });

  it('选择自动模式时保存 null，而不是伪造一个目标路径', async () => {
    await act(async () => render(<EnergyRecordTypeSettings />, host));
    await act(async () => (host.querySelector('[role="combobox"]') as HTMLElement).click());
    const automatic = [...host.querySelectorAll('[role="option"]')].find((node) => node.textContent?.trim() === '自动选择第一个活跃目标') as HTMLElement;
    await act(async () => automatic.click());
    expect(mockSetEnergyDefaultGoalPath).toHaveBeenCalledWith(null);
  });
});
