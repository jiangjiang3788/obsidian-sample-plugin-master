import { createTakeLatest, CancelledError } from '@/shared/utils/takeLatest';

describe('createTakeLatest', () => {
  it('aborts previous run when a new run starts', async () => {
    const tl = createTakeLatest('test');

    const p1 = tl.run(async (signal) => {
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        setTimeout(() => resolve(), 50);
      });
      return 1;
    });

    const p2 = tl.run(async () => 2);

    await expect(p2).resolves.toBe(2);
    await expect(p1).rejects.toBeInstanceOf(CancelledError);
    tl.dispose();
  });
});
