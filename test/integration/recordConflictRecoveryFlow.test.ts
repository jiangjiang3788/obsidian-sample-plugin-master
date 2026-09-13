/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F044/integration
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { InputService } from '@/core/services/InputService';
import { RecordRepository } from '@/core/records/RecordRepository';
import { DEFAULT_TEMPLATE_RECORD_TYPES } from '@core/recordTypes/public';
import { mapSubmitError } from '@/app/usecases/recordInput/error';
import { buildRecordSubmitRecoveryPresentation } from '@/core/recordInput/recovery';

const ID = 'rec.01JWF7T20074QW3VAKQMEWSBH1';
const FILE = '记录.md';
const template = DEFAULT_TEMPLATE_RECORD_TYPES.find((item) => item.id === 'core.thought')!;

function 创建真实数据链环境() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const cache = new Map<string, unknown>();
  let clock = 100;
  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter((path) => path.endsWith('.md'))),
    writeFile: jest.fn(async (path, content) => {
      files.set(path, content);
      clock += 1;
      stats.set(path, { ctime: stats.get(path)?.ctime ?? clock, mtime: clock, size: content.length });
    }),
    deleteFile: jest.fn(async (path) => { files.delete(path); stats.delete(path); }),
  };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => []) };
  const fileStat: FileStatPort = { stat: jest.fn(async (path) => stats.get(path) ?? null) };
  const storage: IPluginStorage = {
    readJSON: async <T,>(path: string) => cache.has(path) ? JSON.parse(JSON.stringify(cache.get(path))) as T : null,
    writeJSON: jest.fn(async (path, value) => { cache.set(path, JSON.parse(JSON.stringify(value))); }),
    remove: jest.fn(async (path) => { cache.delete(path); }),
  };
  const dataStore = new DataStore(vault, metadata, fileStat, storage);
  const repository = new RecordRepository(vault, dataStore);
  const inputService = new InputService(vault, dataStore);
  return { files, dataStore, repository, inputService };
}

describe('P0 Quick Input 冲突恢复真实组合链', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('外部改写导致稳定 ID 消失时产生冲突；恢复文件并重新扫描后，同一更新可以成功重试', async () => {
    const h = 创建真实数据链环境();
    await h.dataStore.warmStart();
    await h.repository.create({
      recordId: ID,
      recordType: 'thought',
      targetFilePath: FILE,
      fields: { 记录子类型: '思考', 内容: '原内容' },
    });
    const originalText = h.files.get(FILE)!;
    const item = h.dataStore.getRecordById(ID)!;

    // 模拟同步软件/手工编辑：DataStore 仍握有旧位置，但磁盘里的 Record 已暂时消失。
    h.files.set(FILE, '# 外部程序临时改写\n');
    let conflict: unknown;
    try {
      await h.inputService.updateExistingRecord(item, template, {
        记录子类型: '思考',
        内容: '冲突恢复后的内容',
      }, { autoRefresh: false });
    } catch (error) {
      conflict = error;
    }

    const result = mapSubmitError('update', conflict, [], { refreshPaths: [FILE] });
    const presentation = buildRecordSubmitRecoveryPresentation(result, {
      fallbackPath: FILE,
      canOpenOriginal: true,
    });
    expect(result.status).toBe('conflict');
    expect(presentation.paths).toEqual([FILE]);
    expect(presentation.canRescan).toBe(true);
    expect(presentation.canRetry).toBe(true);

    // 恢复磁盘内容并通过真实 DataStore 重新扫描，然后使用真实 InputService 重试。
    h.files.set(FILE, originalText);
    await h.dataStore.scanFileByPath(FILE, { throwOnError: true });
    const refreshed = h.dataStore.getRecordById(ID)!;
    await h.inputService.updateExistingRecord(refreshed, template, {
      记录子类型: '思考',
      内容: '冲突恢复后的内容',
    });

    expect(h.files.get(FILE)).toContain('内容:: 冲突恢复后的内容');
    expect(h.dataStore.getRecordById(ID)?.content).toBe('冲突恢复后的内容');
    h.dataStore.dispose();
  });

  it('文件真正丢失时明确给出冲突恢复计划，不会把它伪装成普通未知异常', async () => {
    const h = 创建真实数据链环境();
    await h.dataStore.warmStart();
    await h.repository.create({
      recordId: ID,
      recordType: 'thought',
      targetFilePath: FILE,
      fields: { 记录子类型: '思考', 内容: '原内容' },
    });
    const item = h.dataStore.getRecordById(ID)!;
    h.files.delete(FILE);

    let failure: unknown;
    try {
      await h.inputService.updateExistingRecord(item, template, { 记录子类型: '思考', 内容: '新内容' });
    } catch (error) {
      failure = error;
    }
    const result = mapSubmitError('update', failure, [], { refreshPaths: [FILE] });
    const presentation = buildRecordSubmitRecoveryPresentation(result, { fallbackPath: FILE });
    expect(result.status).toBe('conflict');
    expect(presentation.shouldShow).toBe(true);
    expect(presentation.paths).toContain(FILE);
    h.dataStore.dispose();
  });
});
