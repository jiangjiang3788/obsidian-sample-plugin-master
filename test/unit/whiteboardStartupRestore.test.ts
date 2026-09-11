/**
 * @covers F094/unit
 * @covers F094/regression
 */
import { scheduleWhiteboardRestore } from '@/app/bootstrap/loadDataServices';
import type { WhiteboardStore } from '@core/whiteboard/public';

describe('白板启动恢复时机', () => {
  it('Obsidian workspace 有 onLayoutReady 时必须等 ready 后才 initialize', async () => {
    let callback: (() => void) | undefined;
    const initialize = jest.fn(async () => undefined);
    const store = { initialize, getStatus: () => ({ state: 'ready' as const }) } as unknown as WhiteboardStore;
    const plugin = { app: { workspace: { onLayoutReady: (cb: () => void) => { callback = cb; } } } } as never;
    scheduleWhiteboardRestore({ plugin, store });
    expect(initialize).not.toHaveBeenCalled();
    callback?.();
    await Promise.resolve();
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('非 Obsidian 测试宿主没有 workspace lifecycle 时直接 initialize', async () => {
    const initialize = jest.fn(async () => undefined);
    const store = { initialize, getStatus: () => ({ state: 'ready' as const }) } as unknown as WhiteboardStore;
    scheduleWhiteboardRestore({ plugin: { app: {} } as never, store });
    await Promise.resolve();
    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
