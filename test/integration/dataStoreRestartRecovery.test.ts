/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F018/restart
 * @covers F019/integration
 * @covers F020/restart
 * @covers F120/error
 * @covers F120/integration
 * @covers F120/restart
 * @covers F121/error
 * @covers F121/integration
 * @covers F121/restart
 * @covers F123/error
 * @covers F123/integration
 * @covers F123/regression
 * @covers F123/restart
 * @covers F126/error
 * @covers F126/integration
 * @covers F126/regression
 * @covers F126/restart
 * @covers F132/integration
 * @fault FL-CACHE-001
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { encodeRecordBlock } from '@/core/records/codec';

const RECORD_ID = 'rec.01JWF7T20074QW3VAKQMEWSBE9';

function recordMarkdown(content: string) {
  return encodeRecordBlock({
    recordId: RECORD_ID,
    recordType: 'thought',
    fields: { 记录子类型: '思考', 内容: content },
  });
}

function createHarness() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const storageFiles = new Map<string, unknown>();
  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter((path) => path.endsWith('.md'))),
    writeFile: jest.fn(async (path, content) => { files.set(path, content); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); stats.delete(path); }),
  };
  const metadata: MetadataPort = {
    getHeadings: jest.fn(async () => []),
  };
  const fileStat: FileStatPort = {
    stat: jest.fn(async (path) => stats.get(path) ?? null),
  };
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string) => {
      const value = storageFiles.get(path);
      return value == null ? null : JSON.parse(JSON.stringify(value)) as T;
    },
    writeJSON: jest.fn(async (path, data) => {
      storageFiles.set(path, JSON.parse(JSON.stringify(data)));
    }),
    remove: jest.fn(async (path) => { storageFiles.delete(path); }),
  };
  const put = (path: string, content: string, mtime: number) => {
    files.set(path, content);
    stats.set(path, { ctime: 1, mtime, size: content.length });
  };
  const remove = (path: string) => {
    files.delete(path);
    stats.delete(path);
  };
  return { files, stats, storageFiles, vault, metadata, fileStat, storage, put, remove };
}

function createStore(h: ReturnType<typeof createHarness>) {
  return new DataStore(h.vault, h.metadata, h.fileStat, h.storage);
}

describe('P0 DataStore 暖启动、重启与损坏数据隔离', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('第一次扫描写入缓存；插件重启后未变化文件直接从缓存恢复，变化文件才重新读取', async () => {
    const h = createHarness();
    h.put('records.md', recordMarkdown('第一版'), 100);

    const first = createStore(h);
    await first.scanAll();
    expect(first.getRecordById(RECORD_ID)?.content).toBe('第一版');
    await jest.advanceTimersByTimeAsync(1600);
    expect(h.storageFiles.has('Think/cache.json')).toBe(true);
    first.dispose();

    (h.vault.readFile as jest.Mock).mockClear();
    const restarted = createStore(h);
    await restarted.warmStart();
    expect(restarted.getRecordById(RECORD_ID)?.content).toBe('第一版');
    expect(h.vault.readFile).not.toHaveBeenCalled();
    restarted.dispose();

    h.put('records.md', recordMarkdown('第二版'), 200);
    (h.vault.readFile as jest.Mock).mockClear();
    const changedRestart = createStore(h);
    await changedRestart.warmStart();
    expect(changedRestart.getRecordById(RECORD_ID)?.content).toBe('第二版');
    expect(h.vault.readFile).toHaveBeenCalledTimes(1);
    expect(h.vault.readFile).toHaveBeenCalledWith('records.md');
    changedRestart.dispose();
  });

  it('重启时 Vault 中已经删除的文件不会从旧缓存“复活”', async () => {
    const h = createHarness();
    h.put('deleted-after-restart.md', recordMarkdown('即将删除'), 100);

    const first = createStore(h);
    await first.scanAll();
    await jest.advanceTimersByTimeAsync(1600);
    expect(first.getRecordById(RECORD_ID)).not.toBeNull();
    first.dispose();

    h.remove('deleted-after-restart.md');
    const restarted = createStore(h);
    await restarted.warmStart();
    expect(restarted.getRecordById(RECORD_ID)).toBeNull();
    expect(restarted.queryItems()).toEqual([]);
    restarted.dispose();
  });

  it('同一 Vault 中一个损坏 Record Block 不会阻止其他合法 Record 被索引，并留下完整性问题', async () => {
    const h = createHarness();
    const good = recordMarkdown('合法记录');
    const malformed = [
      '<!-- start -->',
      '记录ID:: rec.01JWF7T20074QW3VAKQMEWSBEX',
      '这不是合法 Record v2 envelope',
      '<!-- end -->',
    ].join('\n');
    h.put('mixed.md', `${malformed}\n\n${good}`, 100);

    const store = createStore(h);
    await store.scanAll();

    expect(store.getRecordById(RECORD_ID)?.content).toBe('合法记录');
    expect(store.getRecordIntegrityIssues().some((issue) => issue.path === 'mixed.md')).toBe(true);
    store.dispose();
  });

  it('手动重建索引即使删除旧缓存失败，也会继续从 Vault 全量恢复当前数据', async () => {
    const h = createHarness();
    h.put('records.md', recordMarkdown('重建前'), 100);

    const store = createStore(h);
    await store.scanAll();
    await jest.advanceTimersByTimeAsync(1600);
    expect(store.getRecordById(RECORD_ID)?.content).toBe('重建前');

    h.put('records.md', recordMarkdown('重建后'), 200);
    (h.storage.remove as jest.Mock).mockRejectedValueOnce(new Error('cache-delete-failed'));
    await store.clearCacheAndRescan('full');

    expect(store.getRecordById(RECORD_ID)?.content).toBe('重建后');
    expect(h.storage.remove).toHaveBeenCalledWith('Think/cache.json');
    store.dispose();
  });


  it('Record 文件在插件关闭期间被外部移动，重启后稳定 ID 不变并定位到新路径', async () => {
    const h = createHarness();
    const content = recordMarkdown('移动但身份不变');
    h.put('old/records.md', content, 100);

    const first = createStore(h);
    await first.scanAll();
    await jest.advanceTimersByTimeAsync(1600);
    expect(first.getRecordLocation(RECORD_ID)?.path).toBe('old/records.md');
    first.dispose();

    h.remove('old/records.md');
    h.put('new/records.md', content, 200);
    const restarted = createStore(h);
    await restarted.warmStart();

    expect(restarted.getRecordById(RECORD_ID)?.id).toBe(RECORD_ID);
    expect(restarted.getRecordLocation(RECORD_ID)?.path).toBe('new/records.md');
    expect(restarted.getRecordLocations(RECORD_ID)).toHaveLength(1);
    restarted.dispose();
  });

});
