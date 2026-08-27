/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F122/unit
 */
import type { EventsPort } from '@/core/ports/EventsPort';
import type { DataStore } from '@/core/services/DataStore';
import { VaultWatcher } from '@/platform/obsidian/events/VaultWatcher';

type 回调集合 = {
  change?: (path: string) => void;
  delete?: (path: string) => void;
  rename?: (newPath: string, oldPath: string) => void;
};

function 创建事件桩() {
  const callbacks: 回调集合 = {};
  const unsubscribe = {
    change: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  };
  const events: EventsPort = {
    onMarkdownCreateOrModify: (cb) => { callbacks.change = cb; return unsubscribe.change; },
    onMarkdownDelete: (cb) => { callbacks.delete = cb; return unsubscribe.delete; },
    onMarkdownRename: (cb) => { callbacks.rename = cb; return unsubscribe.rename; },
    onWorkspaceActiveFileChange: () => jest.fn(),
  };
  return { callbacks, unsubscribe, events };
}

function 创建数据桩() {
  return {
    scanFileByPath: jest.fn(async () => []),
    removeFileItems: jest.fn(),
    notifyChange: jest.fn(),
  } as unknown as DataStore;
}

describe('VaultWatcher 单元行为', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('同一路径连续变化只触发一次扫描；删除会取消待执行扫描', async () => {
    const h = 创建事件桩();
    const dataStore = 创建数据桩();
    const watcher = new VaultWatcher(h.events, dataStore);

    h.callbacks.change?.('记录.md');
    h.callbacks.change?.('记录.md');
    await jest.advanceTimersByTimeAsync(249);
    expect(dataStore.scanFileByPath).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(dataStore.scanFileByPath).toHaveBeenCalledTimes(1);
    expect(dataStore.notifyChange).toHaveBeenCalledTimes(1);

    h.callbacks.change?.('待删除.md');
    h.callbacks.delete?.('待删除.md');
    await jest.advanceTimersByTimeAsync(300);
    expect(dataStore.scanFileByPath).not.toHaveBeenCalledWith('待删除.md');
    expect(dataStore.removeFileItems).toHaveBeenCalledWith('待删除.md');

    watcher.dispose();
  });

  it('释放后解除订阅，并阻止旧回调继续修改 DataStore', async () => {
    const h = 创建事件桩();
    const dataStore = 创建数据桩();
    const watcher = new VaultWatcher(h.events, dataStore);
    watcher.dispose();

    expect(h.unsubscribe.change).toHaveBeenCalledTimes(1);
    expect(h.unsubscribe.delete).toHaveBeenCalledTimes(1);
    expect(h.unsubscribe.rename).toHaveBeenCalledTimes(1);

    h.callbacks.change?.('释放后.md');
    h.callbacks.delete?.('释放后.md');
    h.callbacks.rename?.('新.md', '旧.md');
    await jest.advanceTimersByTimeAsync(300);
    await Promise.resolve();

    expect(dataStore.scanFileByPath).not.toHaveBeenCalled();
    expect(dataStore.removeFileItems).not.toHaveBeenCalled();
    expect(dataStore.notifyChange).not.toHaveBeenCalled();
  });
});
