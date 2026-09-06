/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F034/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { GoalMetricContract } from '@/core/goal/types';
import { flushUi, inputText, waitForUi } from '../support/uiTestUtils';

const mockUpdateGoalMetrics = jest.fn(async (_goalPath: string, _metrics: GoalMetricContract[]) => {});
const mockState: any = {
  settings: {
    goalSettings: {
      goals: [{ path: '健康', status: 'active', metrics: [{ key: 'task.done', label: '完成任务', direction: 'increase', targetValue: 10, unit: '个' }] }],
      goalTemplates: [],
    },
  },
};

jest.mock('@/app/public', () => ({
  selectSettings: (state: any) => state.settings,
  useSelector: (selector: any) => selector(mockState),
  useUseCases: () => ({ goal: { updateGoalMetrics: mockUpdateGoalMetrics } }),
}));

import { GoalMetricSection } from '@/features/settings/input/goalManager/GoalMetricSection';

describe('Goal 指标设置界面', () => {
  let host: HTMLDivElement;
  beforeEach(() => { mockUpdateGoalMetrics.mockClear(); host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('展示已有指标，修改目标值后保存会提交当前 Goal 的指标集合', async () => {
    await act(async () => render(<GoalMetricSection />, host));
    expect(host.textContent).toContain('完成任务 · 10个');

    // 先按真实用户路径点选已有指标，确保编辑草稿来自当前 Goal 的真实指标，
    // 而不是碰巧与组件默认值一致。
    const existingMetric = host.querySelector('.think-chip') as HTMLButtonElement;
    await act(async () => existingMetric.click());
    await flushUi();

    const getTargetInput = () => host.querySelector('input[aria-label="目标值"]') as HTMLInputElement | null;
    const targetInput = getTargetInput();
    expect(targetInput).toBeTruthy();
    await inputText(targetInput!, '12');
    await waitForUi(
      () => getTargetInput()?.value === '12',
      '目标值输入后受控组件没有稳定到新值',
    );

    const save = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '保存指标') as HTMLButtonElement;
    await act(async () => save.click());
    await waitForUi(() => mockUpdateGoalMetrics.mock.calls.length === 1, '点击保存指标后没有提交更新');

    const [goalPath, metrics] = mockUpdateGoalMetrics.mock.calls[0]!;
    expect(goalPath).toBe('健康');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({ key: 'task.done', label: '完成任务', direction: 'increase', targetValue: 12, unit: '个' });
  });

  it('双击指标会提交删除后的指标集合', async () => {
    await act(async () => render(<GoalMetricSection />, host));
    const chip = host.querySelector('.think-chip') as HTMLButtonElement;
    await act(async () => { chip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); });
    await waitForUi(() => mockUpdateGoalMetrics.mock.calls.length === 1, '双击指标后没有提交删除');
    expect(mockUpdateGoalMetrics).toHaveBeenCalledWith('健康', []);
  });
});
