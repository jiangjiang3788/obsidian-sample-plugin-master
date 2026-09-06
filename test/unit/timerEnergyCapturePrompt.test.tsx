/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/ui
 * @covers F056/regression
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { TimerEnergyCapturePrompt } from '@/features/timer/TimerEnergyCapturePrompt';

const request = {
  phase: 'end' as const,
  reason: 'pause' as const,
  timerId: 'timer.1',
  taskId: 'task.1',
  taskTitle: '写代码',
  baselineScore: 80,
};

describe('Timer Energy quick capture prompt', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('1–5 直接记录五档精力，减少结束任务后的额外点击', async () => {
    const onSubmit = jest.fn();
    await act(async () => render(<TimerEnergyCapturePrompt request={request} onSubmit={onSubmit} onSkip={jest.fn()} />, host));

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })));

    expect(onSubmit).toHaveBeenCalledWith(80);
  });

  it('普通任意键或 Escape 可直接跳过可选记录，不阻断任务结束', async () => {
    const onSkip = jest.fn();
    await act(async () => render(<TimerEnergyCapturePrompt request={request} onSubmit={jest.fn()} onSkip={onSkip} />, host));

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('面板保持紧凑，不重复显示任务名称或快捷键说明', async () => {
    await act(async () => render(<TimerEnergyCapturePrompt request={request} onSubmit={jest.fn()} onSkip={jest.fn()} />, host));

    expect(host.textContent).not.toContain('写代码');
    expect(host.textContent).not.toContain('1–5 快速记录');
    expect(host.textContent).toContain('结束精力');
  });

  it('Enter 保存当前滑块值，结束采集默认从开始精力值继续微调', async () => {
    const onSubmit = jest.fn();
    await act(async () => render(<TimerEnergyCapturePrompt request={request} onSubmit={onSubmit} onSkip={jest.fn()} />, host));

    const range = host.querySelector('input[type="range"]') as HTMLInputElement;
    expect(range.value).toBe('80');
    range.value = '72';
    await act(async () => range.dispatchEvent(new Event('input', { bubbles: true })));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));

    expect(onSubmit).toHaveBeenCalledWith(72);
  });
});
