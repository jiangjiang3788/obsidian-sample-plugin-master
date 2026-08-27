/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/restart
 * @covers F015/restart
 * @covers F016/regression
 * @covers F016/restart
 * @covers F126/integration
 * @covers F126/persistence
 * @covers F126/regression
 * @covers F126/restart
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { FileStat, FileStatPort } from '@/core/ports/FileStatPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { DataStore } from '@/core/services/DataStore';
import { RecordRepository } from '@/core/records/RecordRepository';

const ID = 'rec.01JWF7T20074QW3VAKQMEWSBG0';

function createEnvironment() {
  const files = new Map<string, string>();
  const stats = new Map<string, FileStat>();
  const storageFiles = new Map<string, unknown>();
  let clock = 100;

  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: jest.fn(() => [...files.keys()].filter((path) => path.endsWith('.md'))),
    writeFile: jest.fn(async (path, content) => {
      files.set(path, content);
      clock += 1;
      stats.set(path, { ctime: stats.get(path)?.ctime ?? clock, mtime: clock, size: content.length });
    }),
    deleteFile: jest.fn(async (path) => {
      files.delete(path);
      stats.delete(path);
    }),
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

  const boot = async () => {
    const dataStore = new DataStore(vault, metadata, fileStat, storage);
    await dataStore.warmStart();
    const repository = new RecordRepository(vault, dataStore);
    return { dataStore, repository };
  };

  return { files, boot };
}

describe('P0 Record 创建/修改/删除在插件重启后的真实持久化生命周期', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('创建后重启仍存在，修改后重启仍是新值，删除后重启不会从文件或缓存复活', async () => {
    const env = createEnvironment();

    const first = await env.boot();
    await first.repository.create({
      recordId: ID,
      coreBlock: 'thought',
      targetFilePath: 'records.md',
      fields: { 记录子类型: '思考', 内容: '创建后的内容', 清晰度: 2 },
    });
    expect(first.dataStore.getRecordById(ID)?.content).toBe('创建后的内容');
    first.dataStore.dispose();

    const afterCreateRestart = await env.boot();
    expect(afterCreateRestart.dataStore.getRecordById(ID)?.content).toBe('创建后的内容');
    expect(env.files.get('records.md')).toContain(`记录ID:: ${ID}`);

    await afterCreateRestart.repository.update(ID, { 内容: '修改后的内容', 清晰度: 5 });
    expect(afterCreateRestart.dataStore.getRecordById(ID)?.content).toBe('修改后的内容');
    afterCreateRestart.dataStore.dispose();

    const afterUpdateRestart = await env.boot();
    expect(afterUpdateRestart.dataStore.getRecordById(ID)?.content).toBe('修改后的内容');
    expect((afterUpdateRestart.dataStore.getRecordById(ID) as any)?.extra?.清晰度).toBe(5);

    await afterUpdateRestart.repository.delete(ID);
    expect(afterUpdateRestart.dataStore.getRecordById(ID)).toBeNull();
    afterUpdateRestart.dataStore.dispose();

    const afterDeleteRestart = await env.boot();
    expect(afterDeleteRestart.dataStore.getRecordById(ID)).toBeNull();
    expect(afterDeleteRestart.dataStore.queryItems().some((item) => item.id === ID)).toBe(false);
    expect(env.files.get('records.md') || '').not.toContain(ID);
    afterDeleteRestart.dataStore.dispose();
  });
});
