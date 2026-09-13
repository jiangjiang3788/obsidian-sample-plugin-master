/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F046/unit
 * @covers F046/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';

import { EnergyQuickCapturePanel } from '@/features/quickinput/editor/components/EnergyQuickCapturePanel';
import type { GoalSelectorOption } from '@/features/quickinput/editor/components/GoalSelector';

const goals: GoalSelectorOption[] = [
  { id: '生活/暂停', value: '生活/暂停', label: '暂停', goal: { path: '生活/暂停', status: 'paused', createdAt: '', updatedAt: '' } as any },
  { id: '生活/活跃', value: '生活/活跃', label: '活跃', goal: { path: '生活/活跃', status: 'active', createdAt: '', updatedAt: '' } as any },
];

function Harness({ onCapture, defaultGoalPath = '' }: { onCapture: jest.Mock; defaultGoalPath?: string }) {
  const [selectedGoalPath, setSelectedGoalPath] = useState<string | null>(null);
  return (
    <EnergyQuickCapturePanel
      blocks={[{ id: 'core.energy', name: '精力' }]}
      allowRecordTypeSwitch={false}
      currentRecordTypeId="core.energy"
      onRecordTypeChange={jest.fn()}
      goals={goals}
      selectedGoalPath={selectedGoalPath}
      onSelectGoal={(goal) => setSelectedGoalPath(goal?.value || null)}
      defaultGoalPath={defaultGoalPath}
      onCapture={onCapture}
    />
  );
}

describe('EnergyQuickCapturePanel', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('auto-selects the first active Goal and enables quick capture when no default is configured', async () => {
    const onCapture = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      render(<Harness onCapture={onCapture} />, host);
    });

    expect(host.textContent).toContain('生活/活跃');
    const score80 = host.querySelector('button[title^="80 ·"]') as HTMLButtonElement;
    expect(score80).toBeTruthy();
    expect(score80.disabled).toBe(false);

    await act(async () => {
      score80.click();
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith({
      scoreMode: 'quick',
      score: 80,
      goalPath: '生活/活跃',
      captureMode: 'realtime',
    });
  });

  it('prefers an explicitly configured default Goal', async () => {
    const onCapture = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      render(<Harness onCapture={onCapture} defaultGoalPath="生活/暂停" />, host);
    });

    expect(host.textContent).toContain('生活/暂停');
    const score60 = host.querySelector('button[title^="60 ·"]') as HTMLButtonElement;
    expect(score60.disabled).toBe(false);
  });
});
