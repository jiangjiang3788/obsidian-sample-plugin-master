/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/error
 * @covers F015/error
 * @covers F016/error
 * @covers F017/error
 * @covers F043/error
 */
import { buildCreateRecordFollowUp, CreateRecordWorkflow } from '@/app/usecases/recordInput/workflows/CreateRecordWorkflow';
import { UpdateRecordWorkflow } from '@/app/usecases/recordInput/workflows/UpdateRecordWorkflow';

describe('record input create follow-up', () => {
  it('starts a timer only for a newly created open Task', () => {
    expect(buildCreateRecordFollowUp({ id: 'task-open', recordType: 'task', status: 'open' })).toEqual({ startTimerForRecordId: 'task-open' });
    expect(buildCreateRecordFollowUp({ id: 'task-done', recordType: 'task', status: 'done' })).toBeUndefined();
    expect(buildCreateRecordFollowUp({ id: 'event-1', recordType: 'event', status: 'open' })).toBeUndefined();
  });
});

describe('record input workflow error boundary', () => {
  const preparationFailure = new Error('legacy_ai_value_prepare_failed');

  it('maps create preparation exceptions to RecordSubmitResult instead of rejecting', async () => {
    const workflow = new CreateRecordWorkflow({
      getKernel: () => { throw preparationFailure; },
      deps: {} as never,
    });

    await expect(workflow.submit({
      recordTypeId: 'task',
      formData: { 内容: '测试任务' },
      source: 'ai_batch',
    } as never)).resolves.toMatchObject({
      status: 'error',
      operation: 'create',
      errors: [expect.objectContaining({ message: 'legacy_ai_value_prepare_failed' })],
    });
  });

  it('maps update preparation exceptions to RecordSubmitResult instead of rejecting', async () => {
    const workflow = new UpdateRecordWorkflow({
      getKernel: () => { throw preparationFailure; },
      deps: {
        dataStore: {
          scanFileByPath: jest.fn(),
          notifyDataChanged: jest.fn(),
        },
      } as never,
    });

    await expect(workflow.submit({
      recordTypeId: 'task',
      formData: { 内容: '测试任务' },
      item: { id: 'task-1', source: { path: 'Tasks.md', startLine: 0 } },
      source: 'ai_batch',
    } as never)).resolves.toMatchObject({
      status: 'error',
      operation: 'update',
      errors: [expect.objectContaining({ message: 'legacy_ai_value_prepare_failed' })],
    });
  });
});
