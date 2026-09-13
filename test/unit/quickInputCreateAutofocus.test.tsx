/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F042/ui
 * @covers F042/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

import { QuickInputEditorView } from '@/features/quickinput/editor/QuickInputEditorView';

const taskTemplate = {
  id: 'core.task',
  recordTypeId: 'core.task',
  fields: [
    { id: 'status', key: 'status', label: '状态', type: 'singleSelect', semantic: 'status', options: [
      { value: 'open', label: '未完成' },
      { value: 'done', label: '已完成' },
    ] },
    { id: 'body', key: '任务内容', label: '内容', type: 'text', semantic: 'body' },
  ],
};

function viewProps(overrides: Record<string, unknown> = {}) {
  return {
    getResourcePath: (path: string) => path,
    recordTypes: [{ id: 'core.task', name: '任务' }],
    allowRecordTypeSwitch: false,
    currentRecordTypeId: 'core.task',
    onRecordTypeChange: jest.fn(),
    goals: [],
    selectedGoalPath: null,
    onSelectGoal: jest.fn(),
    template: taskTemplate,
    formData: { status: 'open', 任务内容: '' },
    onUpdateField: jest.fn(),
    autoFocusContent: true,
    ...overrides,
  } as any;
}

describe('QuickInput create content autofocus', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('imperatively focuses the Task body after modal focus settling', async () => {
    await act(async () => render(<QuickInputEditorView {...viewProps()} />, host));
    await act(async () => { jest.advanceTimersByTime(150); });

    const content = host.querySelector('[data-quick-input-content="true"]') as HTMLInputElement | null;
    expect(content).toBeTruthy();
    expect(document.activeElement).toBe(content);
  });

  it('does not mark or steal focus when autofocus is disabled for embedded flows', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    await act(async () => render(<QuickInputEditorView {...viewProps({ autoFocusContent: false })} />, host));
    await act(async () => { jest.advanceTimersByTime(150); });

    expect(host.querySelector('[data-quick-input-content="true"]')).toBeNull();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('focuses only once and Goal/template hydration later does not steal focus back', async () => {
    await act(async () => render(<QuickInputEditorView {...viewProps()} />, host));
    await act(async () => { jest.advanceTimersByTime(150); });

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    await act(async () => render(
      <QuickInputEditorView {...viewProps({ selectedGoalPath: '武装大脑', formData: { status: 'open', 任务内容: '', priority: 'highest' } })} />,
      host,
    ));
    await act(async () => { jest.advanceTimersByTime(150); });

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
