/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F122/error
 * @covers F122/integration
 * @covers F122/regression
 * @covers F122/restart
 */
import type { EventsPort } from '@/core/ports/EventsPort';
import type { DataStore } from '@/core/services/DataStore';
import { VaultWatcher } from '@/platform/obsidian/events/VaultWatcher';

type EventCallbacks = {
  change?: (path: string) => void;
  delete?: (path: string) => void;
  rename?: (newPath: string, oldPath: string) => void;
  active?: (path: string | null) => void;
};

function createEventsHarness() {
  const callbacks: EventCallbacks = {};
  const unsubscribe = {
    change: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
    active: jest.fn(),
  };
  const events: EventsPort = {
    onMarkdownCreateOrModify: (cb) => { callbacks.change = cb; return unsubscribe.change; },
    onMarkdownDelete: (cb) => { callbacks.delete = cb; return unsubscribe.delete; },
    onMarkdownRename: (cb) => { callbacks.rename = cb; return unsubscribe.rename; },
    onWorkspaceActiveFileChange: (cb) => { callbacks.active = cb; return unsubscribe.active; },
  };
  return { callbacks, unsubscribe, events };
}

function createDataStoreHarness() {
  return {
    scanFileByPath: jest.fn(async () => []),
    removeFileItems: jest.fn(),
    notifyChange: jest.fn(),
  } as unknown as DataStore;
}

describe('P0 VaultWatcher 文件事件 → DataStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('同一文件的高频 create/modify 会防抖为一次扫描，并只在成功后通知刷新', async () => {
    const h = createEventsHarness();
    const dataStore = createDataStoreHarness();
    const watcher = new VaultWatcher(h.events, dataStore);

    h.callbacks.change?.('Records.md');
    h.callbacks.change?.('Records.md');
    h.callbacks.change?.('Records.md');

    await jest.advanceTimersByTimeAsync(249);
    expect(dataStore.scanFileByPath).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(dataStore.scanFileByPath).toHaveBeenCalledTimes(1);
    expect(dataStore.scanFileByPath).toHaveBeenCalledWith('Records.md');
    expect(dataStore.notifyChange).toHaveBeenCalledTimes(1);

    watcher.dispose();
  });

  it('删除会取消尚未执行的扫描；重命名先移除旧索引，再扫描新路径；dispose 后不再产生副作用', async () => {
    const h = createEventsHarness();
    const dataStore = createDataStoreHarness();
    const watcher = new VaultWatcher(h.events, dataStore);

    h.callbacks.change?.('to-delete.md');
    h.callbacks.delete?.('to-delete.md');
    await jest.advanceTimersByTimeAsync(300);

    expect(dataStore.scanFileByPath).not.toHaveBeenCalledWith('to-delete.md');
    expect(dataStore.removeFileItems).toHaveBeenCalledWith('to-delete.md');
    expect(dataStore.notifyChange).toHaveBeenCalledTimes(1);

    h.callbacks.rename?.('new.md', 'old.md');
    await Promise.resolve();
    await Promise.resolve();

    expect(dataStore.removeFileItems).toHaveBeenCalledWith('old.md');
    expect(dataStore.scanFileByPath).toHaveBeenCalledWith('new.md', { throwOnError: true });
    expect(dataStore.notifyChange).toHaveBeenCalledTimes(2);

    watcher.dispose();
    expect(h.unsubscribe.change).toHaveBeenCalledTimes(1);
    expect(h.unsubscribe.delete).toHaveBeenCalledTimes(1);
    expect(h.unsubscribe.rename).toHaveBeenCalledTimes(1);

    h.callbacks.change?.('after-dispose.md');
    h.callbacks.delete?.('after-dispose.md');
    h.callbacks.rename?.('after-new.md', 'after-old.md');
    await jest.advanceTimersByTimeAsync(300);
    await Promise.resolve();

    expect(dataStore.scanFileByPath).not.toHaveBeenCalledWith('after-dispose.md');
    expect(dataStore.scanFileByPath).not.toHaveBeenCalledWith('after-new.md', expect.anything());
  });

  it('重命名后的新文件扫描失败时不发送成功刷新通知，旧路径仍会被清理', async () => {
    const h = createEventsHarness();
    const dataStore = createDataStoreHarness();
    (dataStore.scanFileByPath as jest.Mock).mockRejectedValueOnce(new Error('scan-failed'));
    const watcher = new VaultWatcher(h.events, dataStore);

    h.callbacks.rename?.('broken-new.md', 'old.md');
    await Promise.resolve();
    await Promise.resolve();

    expect(dataStore.removeFileItems).toHaveBeenCalledWith('old.md');
    expect(dataStore.scanFileByPath).toHaveBeenCalledWith('broken-new.md', { throwOnError: true });
    expect(dataStore.notifyChange).not.toHaveBeenCalled();

    watcher.dispose();
  });

  it('旧 watcher dispose 后创建新 watcher，相当于插件重载后仍会重新注册并处理文件事件', async () => {
    const firstEvents = createEventsHarness();
    const firstStore = createDataStoreHarness();
    const firstWatcher = new VaultWatcher(firstEvents.events, firstStore);
    firstWatcher.dispose();

    firstEvents.callbacks.change?.('stale-callback.md');
    await jest.advanceTimersByTimeAsync(300);
    expect(firstStore.scanFileByPath).not.toHaveBeenCalled();

    const restartedEvents = createEventsHarness();
    const restartedStore = createDataStoreHarness();
    const restartedWatcher = new VaultWatcher(restartedEvents.events, restartedStore);
    restartedEvents.callbacks.change?.('after-reload.md');
    await jest.advanceTimersByTimeAsync(250);

    expect(restartedStore.scanFileByPath).toHaveBeenCalledWith('after-reload.md');
    expect(restartedStore.notifyChange).toHaveBeenCalledTimes(1);
    restartedWatcher.dispose();
  });

});
