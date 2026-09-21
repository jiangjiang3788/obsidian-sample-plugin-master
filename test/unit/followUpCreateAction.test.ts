/**
 * @covers Record continuation UI/application bridge
 */
import { openRecordContinuationOption } from '@/app/public';
import type { ModalPort } from '@/core/ports/public';
import type { RecordContinuationOption } from '@/core/recordInput/public';

const option: RecordContinuationOption = {
  kind: 'create_record',
  label: '打卡',
  recordTypeId: 'core.habit',
  allowRecordTypeSwitch: false,
  context: {
    goalPath: '照顾好自己/睡眠',
    date: '2026-09-14',
    __recordContinuation: {
      sourceRecordId: 'task_sleep_1',
      reason: 'task_completion',
      expectedGoalPath: '照顾好自己/睡眠',
      completedRecordTypeIds: ['core.task'],
    },
  },
};

function modalPort() {
  return { openQuickInput: jest.fn() } as unknown as ModalPort;
}

describe('Record continuation presenter', () => {
  it('opens the chosen locked QuickInput with the continuation context', () => {
    const port = modalPort();
    openRecordContinuationOption(port, option);

    expect(port.openQuickInput).toHaveBeenCalledWith('core.habit', {
      context: option.context,
      allowRecordTypeSwitch: false,
      source: 'quickinput',
    });
  });
});
