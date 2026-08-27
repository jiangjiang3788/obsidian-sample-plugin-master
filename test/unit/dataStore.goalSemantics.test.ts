/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F030/unit
 * @covers F120/unit
 */
import { DataStore } from '@/core/services/DataStore';
import type { FileStatPort } from '@/core/ports/FileStatPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import { encodeRecordBlock } from '@/core/records/codec';

function createDataStoreForContent(content: string) {
  const vault: VaultPort = { readFile: jest.fn(async (path: string) => path === 'daily.md' ? content : null), listMarkdownFilePaths: jest.fn(() => ['daily.md']), writeFile: jest.fn(async () => undefined), deleteFile: jest.fn(async () => undefined) };
  const metadata: MetadataPort = { getHeadings: jest.fn(async () => [{ line: 0, heading: '学习/英语' }]) };
  const fileStat: FileStatPort = { stat: jest.fn(async () => ({ ctime: 1, mtime: 2, size: content.length })) };
  const storage: IPluginStorage = { readJSON: jest.fn(async () => null), writeJSON: jest.fn(async () => undefined), remove: jest.fn(async () => undefined) };
  return new DataStore(vault, metadata, fileStat, storage);
}

describe('DataStore Goal semantics', () => {
  it('keeps file heading separate from explicit Goal path', async () => {
    const implicit = encodeRecordBlock({ recordId: 'task.01J00000000000000000000051', coreBlock: 'task', fields: { status: 'open', content: '无目标任务' } });
    const explicit = encodeRecordBlock({ recordId: 'task.01J00000000000000000000052', coreBlock: 'task', fields: { status: 'open', content: '英语任务', 目标: '学习/英语' } });
    const store = createDataStoreForContent(['# 学习/英语', implicit, explicit].join('\n'));
    const items = await store.scanFileByPath('daily.md');
    expect(items).toHaveLength(2);
    const a = items.find((item) => item.id.endsWith('51'))!;
    const b = items.find((item) => item.id.endsWith('52'))!;
    expect(a.header).toBe('学习/英语');
    expect(a.goalPath).toBeUndefined();
    expect(b.header).toBe('学习/英语');
    expect(b.goalPath).toBe('学习/英语');
    expect(b.rootGoal).toBe('学习');
    expect(b.leafGoal).toBe('英语');
  });
});
