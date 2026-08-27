/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F120/performance
 * @covers F121/performance
 * @covers F123/performance
 * @covers F132/performance
 * @covers F132/regression
 */
import { performance } from 'perf_hooks';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { encodeRecordBlock } from '@/core/records/codec';
import { recordPerformanceMetric } from './support/performanceRecorder';

jest.setTimeout(45_000);

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function stableId(index: number): string {
  let n = index;
  let suffix = '';
  do {
    suffix = CROCKFORD[n % 32] + suffix;
    n = Math.floor(n / 32);
  } while (n > 0);
  return `rec.01JWF7T2${suffix.padStart(18, '0')}`;
}

function makeRecord(index: number): string {
  return encodeRecordBlock({
    recordId: stableId(index),
    coreBlock: 'thought',
    fields: { 记录子类型: '思考', 内容: `大 Vault 样本 ${index}` },
  });
}

function createHarness(fileCount = 1_500) {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const cache = new Map<string, unknown>();
  for (let i = 0; i < fileCount; i += 1) {
    const path = `PerfVault/${String(i).padStart(5, '0')}.md`;
    const content = makeRecord(i);
    files.set(path, content);
    stats.set(path, { ctime: i + 1, mtime: i + 1, size: content.length });
  }

  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()]),
    writeFile: jest.fn(async (path, content) => { files.set(path, content); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); stats.delete(path); }),
  };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => []) };
  const fileStat: FileStatPort = { stat: jest.fn(async (path) => stats.get(path) ?? null) };
  const storage: IPluginStorage = {
    readJSON: jest.fn(async <T,>(path: string) => (cache.has(path) ? JSON.parse(JSON.stringify(cache.get(path))) as T : null)),
    writeJSON: jest.fn(async (path, value) => { cache.set(path, JSON.parse(JSON.stringify(value))); }),
    remove: jest.fn(async (path) => { cache.delete(path); }),
  };
  return { files, stats, cache, vault, metadata, fileStat, storage };
}

describe('P0 DataStore / Vault 扫描 / 重建索引性能基线', () => {
  it('1,500 个 Markdown 文件全量扫描、查询和重建保持正确，并受灾难性回归预算保护', async () => {
    const h = createHarness();
    const store = new DataStore(h.vault, h.metadata, h.fileStat, h.storage);

    const scanStarted = performance.now();
    await store.scanAll();
    const scanMs = performance.now() - scanStarted;

    expect(store.queryItems()).toHaveLength(1_500);
    expect(store.getRecordById(stableId(0))?.content).toBe('大 Vault 样本 0');
    expect(store.getRecordById(stableId(1499))?.content).toBe('大 Vault 样本 1499');

    const queryStarted = performance.now();
    for (let i = 0; i < 100; i += 1) store.queryItems();
    const queryMs = performance.now() - queryStarted;

    const rebuildStarted = performance.now();
    await store.clearCacheAndRescan('full');
    const rebuildMs = performance.now() - rebuildStarted;

    expect(store.queryItems()).toHaveLength(1_500);
    expect(store.getRecordIntegrityIssues().filter((issue) => issue.code === 'record_id_duplicate')).toEqual([]);

    recordPerformanceMetric({ id: 'datastore.scan-1500', label: 'DataStore 扫描 1500 文件', valueMs: scanMs, budgetMs: 12_000, sampleSize: 1_500 });
    recordPerformanceMetric({ id: 'datastore.query-100', label: 'DataStore 100 次查询', valueMs: queryMs, budgetMs: 2_000, sampleSize: 100 });
    recordPerformanceMetric({ id: 'datastore.rebuild-1500', label: 'DataStore 重建 1500 文件', valueMs: rebuildMs, budgetMs: 12_000, sampleSize: 1_500 });
    console.info(`性能基线：DataStore 扫描 1500 个文件耗时 ${scanMs.toFixed(1)} 毫秒；100 次查询耗时 ${queryMs.toFixed(1)} 毫秒；重建耗时 ${rebuildMs.toFixed(1)} 毫秒`);
    expect(scanMs).toBeLessThan(12_000);
    expect(queryMs).toBeLessThan(2_000);
    expect(rebuildMs).toBeLessThan(12_000);
    store.dispose();
  });
});
