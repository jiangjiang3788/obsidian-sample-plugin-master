import { CreateRecordWorkflow } from '@/app/usecases/recordInput/workflows/CreateRecordWorkflow';
import { UpdateRecordWorkflow } from '@/app/usecases/recordInput/workflows/UpdateRecordWorkflow';

describe('record input workflow error boundary', () => {
  const preparationFailure = new Error('legacy_ai_value_prepare_failed');

  it('maps create preparation exceptions to RecordSubmitResult instead of rejecting', async () => {
    const workflow = new CreateRecordWorkflow({
      getKernel: () => { throw preparationFailure; },
      deps: {} as never,
    });

    await expect(workflow.submit({
      blockId: 'task',
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
      blockId: 'task',
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
