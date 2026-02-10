import { useSaveHandlerWithValidation } from '@/shared/patterns/ModalSavePattern';

describe('useSaveHandlerWithValidation', () => {
  it('uses uiPort.notice on validation error and does not call saveAction', async () => {
    const notice = jest.fn(() => ({ hide: () => void 0 }));
    const saveAction = jest.fn(async () => {});

    const handler = useSaveHandlerWithValidation(
      (data: { name: string }) => (data.name ? null : 'name required'),
      saveAction,
      { uiPort: { notice } as any }
    );

    await handler({ name: '' });
    expect(saveAction).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith(expect.stringMatching(/验证失败/));
  });
});
