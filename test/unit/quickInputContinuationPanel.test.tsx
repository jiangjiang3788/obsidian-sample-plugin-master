/**
 * @covers QuickInput continuation UI
 */
/** @jsxImportSource preact */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { QuickInputContinuationPanel } from '@/features/quickinput/modal/QuickInputContinuationPanel';
import type { RecordContinuationFollowUp } from '@/core/recordInput/public';

const baseContext = {
  goalPath: '照顾好自己/睡眠',
  date: '2026-09-14',
  __recordContinuation: {
    sourceRecordId: 'task_sleep_1',
    reason: 'task_completion' as const,
    expectedGoalPath: '照顾好自己/睡眠',
    completedRecordTypeIds: ['core.task'],
  },
};

const continuation: RecordContinuationFollowUp = {
  kind: 'record_continuation',
  reason: 'task_completion',
  sourceRecordId: 'task_sleep_1',
  goalPath: '照顾好自己/睡眠',
  dismissOnOutsideClick: true,
  options: [
    { kind: 'create_record', label: '精力', recordTypeId: 'core.energy', allowRecordTypeSwitch: false, context: baseContext },
    { kind: 'create_record', label: '打卡', recordTypeId: 'core.habit', allowRecordTypeSwitch: false, context: baseContext },
  ],
};

describe('QuickInputContinuationPanel', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  it('renders ordered RecordType actions and delegates select/finish without creating data itself', async () => {
    const onSelect = jest.fn();
    const onFinish = jest.fn();
    await act(async () => {
      render(<QuickInputContinuationPanel continuation={continuation} onSelect={onSelect} onFinish={onFinish} />, host);
    });

    expect(host.textContent).toContain('已记录');
    expect(host.textContent).toContain('照顾好自己/睡眠');
    const optionButtons = [...host.querySelectorAll('.think-quick-input-continuation__option')] as HTMLButtonElement[];
    expect(optionButtons.map((button) => button.getAttribute('data-record-type'))).toEqual(['energy', 'habit']);

    await act(async () => { optionButtons[1].click(); });
    const finish = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '完成') as HTMLButtonElement;
    await act(async () => { finish.click(); });
    expect(onSelect).toHaveBeenCalledWith(continuation.options[1]);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
