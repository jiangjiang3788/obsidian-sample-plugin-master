/**
 * @covers Task completion continuation application wiring
 */
import type { AppStoreApi } from '@/app/usecases/AppStoreApi';
import { RecordInputUseCase } from '@/app/usecases/recordInput.usecase';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';

function settings(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    floatingTimerEnabled: true,
    goalSettings: {
      goals: [{ path: '照顾好自己/睡眠', status: 'active', metrics: [], createdAt: '', updatedAt: '' }],
      goalTemplates: [
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.task', enabled: true },
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.habit', enabled: true },
      ],
    },
  } as never;
}

describe('RecordInputUseCase Task completion FollowUp', () => {
  it('attaches same-Goal continuation options only after the completed Task has been refreshed', async () => {
    const task: any = {
      id: 'task_1',
      recordType: 'task',
      status: 'open',
      title: '睡觉',
      content: '睡觉',
      tags: [],
      goalPath: '照顾好自己/睡眠',
      created: 0,
      modified: 0,
      extra: {},
    };
    const dataStore = {
      getRecordLocation: jest.fn(() => ({ path: '01/目标.md' })),
      getRecordById: jest.fn(() => task),
      scanFileByPath: jest.fn(async () => [task]),
      notifyChange: jest.fn(),
    };
    const itemService = {
      completeItem: jest.fn(async () => {
        task.status = 'done';
        task.completedAt = '2026-09-14T08:30:00';
      }),
    };
    const store = { getState: () => ({ settings: settings() }) } as unknown as AppStoreApi;
    const useCase = new RecordInputUseCase(store, {
      inputService: {} as never,
      itemService: itemService as never,
      dataStore: dataStore as never,
    });

    const result = await useCase.submitCompleteRecord({ itemId: task.id, source: 'quickinput' });

    expect(result.status).toBe('success');
    expect(dataStore.scanFileByPath).toHaveBeenCalledWith('01/目标.md');
    expect(result.followUp?.continuation).toMatchObject({
      kind: 'record_continuation',
      sourceRecordId: 'task_1',
      goalPath: '照顾好自己/睡眠',
    });
    expect(result.followUp?.continuation?.options.map((option) => option.recordTypeId)).toEqual([
      'core.energy', 'core.habit',
    ]);
    expect(result.followUp?.continuation?.options.find((option) => option.recordTypeId === 'core.habit')).toMatchObject({
      label: '打卡',
      allowRecordTypeSwitch: false,
      context: {
        goalPath: '照顾好自己/睡眠',
        __recordContinuation: { sourceRecordId: 'task_1', reason: 'task_completion', completedRecordTypeIds: ['core.task'] },
      },
    });
  });
});
