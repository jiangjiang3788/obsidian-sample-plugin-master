/**
 * @covers F103/unit
 */
import { createViewSettingsWriteBarrier } from '@/features/settings/layout/viewSettingsWriteBarrier';

describe('View settings persistence barrier', () => {
  it('保存必须等待真实异步写盘完成，不能用固定延迟冒充完成', async () => {
    const barrier = createViewSettingsWriteBarrier();
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => { resolveWrite = resolve; });
    barrier.track(write);

    let flushed = false;
    const flushPromise = barrier.flush().then(() => { flushed = true; });
    await Promise.resolve();
    expect(flushed).toBe(false);

    resolveWrite();
    await flushPromise;
    expect(flushed).toBe(true);
  });

  it('任一写盘失败时 flush 失败，保存按钮不能把失败包装成成功', async () => {
    const barrier = createViewSettingsWriteBarrier();
    barrier.track(Promise.reject(new Error('saveData failed')));
    await expect(barrier.flush()).rejects.toThrow('saveData failed');
  });
});
