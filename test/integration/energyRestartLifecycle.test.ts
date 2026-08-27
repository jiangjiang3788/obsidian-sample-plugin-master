/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F065/error
 * @covers F065/integration
 * @covers F065/persistence
 * @covers F065/restart
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { buildEnergySnapshotMarkdown } from '@/core/energy/record';

function createEnvironment() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const storageFiles = new Map<string, unknown>();
  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter((path) => path.endsWith('.md'))),
    writeFile: jest.fn(async (path, content) => { files.set(path, content); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); stats.delete(path); }),
  };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => []) };
  const fileStat: FileStatPort = { stat: jest.fn(async (path) => stats.get(path) ?? null) };
  const storage: IPluginStorage = {
    readJSON: jest.fn(async <T,>(path: string) => {
      const value = storageFiles.get(path);
      return value == null ? null : JSON.parse(JSON.stringify(value)) as T;
    }),
    writeJSON: jest.fn(async (path, data) => { storageFiles.set(path, JSON.parse(JSON.stringify(data))); }),
    remove: jest.fn(async (path) => { storageFiles.delete(path); }),
  };
  const put = (path: string, content: string, mtime: number) => {
    files.set(path, content);
    stats.set(path, { ctime: 1, mtime, size: content.length });
  };
  const boot = async () => {
    const store = new DataStore(vault, metadata, fileStat, storage);
    await store.warmStart();
    return store;
  };
  return { files, put, boot };
}

describe('P0 Energy Record 持久化与重启恢复', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('合法精力 Markdown 被索引后，插件重启仍恢复同一精力记录与详细分值', async () => {
    const env = createEnvironment();
    const markdown = buildEnergySnapshotMarkdown({
      goalPath: '健康/睡眠',
      date: '2026-08-24',
      time: '08:15',
      scoreMode: 'detailed',
      brainScore: 80,
      physicalScore: 60,
      captureMode: 'realtime',
      timePrecision: 'exact',
      source: 'test',
    });
    env.put('01/目标精力.md', markdown, 100);

    const first = await env.boot();
    const energy = first.queryRecords().find((item) => item.coreBlock === 'energy') as any;
    expect(energy).toBeTruthy();
    expect(energy.goalPath).toBe('健康/睡眠');
    expect(energy.extra).toMatchObject({ 精力值: 70, 脑力精力: 80, 体力精力: 60 });
    const id = energy.id;
    await jest.advanceTimersByTimeAsync(1600);
    first.dispose();

    const restarted = await env.boot();
    const restored = restarted.getRecordById(id) as any;
    expect(restored?.coreBlock).toBe('energy');
    expect(restored?.extra).toMatchObject({ 精力值: 70, 脑力精力: 80, 体力精力: 60 });
    restarted.dispose();
  });

  it('精力文件在关闭期间损坏后，重启不会从旧缓存复活旧 Energy，并报告完整性问题', async () => {
    const env = createEnvironment();
    const markdown = buildEnergySnapshotMarkdown({
      goalPath: '健康', date: '2026-08-24', time: '09:00', score: 80,
      scoreMode: 'quick', captureMode: 'realtime', timePrecision: 'exact', source: 'test',
    });
    env.put('01/目标精力.md', markdown, 100);

    const first = await env.boot();
    const energy = first.queryRecords().find((item) => item.coreBlock === 'energy');
    expect(energy).toBeTruthy();
    const id = energy!.id;
    await jest.advanceTimersByTimeAsync(1600);
    first.dispose();

    const broken = [
      '<!-- start -->',
      '记录类型:: energy',
      '目标:: 健康',
      '日期:: 2026-08-24',
      '精力值:: 80',
      '<!-- end -->',
    ].join('\n');
    env.put('01/目标精力.md', broken, 200);

    const restarted = await env.boot();
    expect(restarted.getRecordById(id)).toBeNull();
    expect(restarted.queryRecords().some((item) => item.coreBlock === 'energy')).toBe(false);
    expect(restarted.getRecordIntegrityIssues().some((issue) => issue.path === '01/目标精力.md')).toBe(true);
    restarted.dispose();
  });
});
