import { DataStore } from '@/core/services/DataStore';
import type { FileStatPort } from '@/core/ports/FileStatPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import type { IThemeMatcher } from '@/core/types/theme';
import { encodeRecordBlock } from '@/core/records/codec';

function createDataStoreForContent(content: string) {
  const vault: VaultPort = {
    readFile: jest.fn(async (path: string) => (path === 'daily.md' ? content : null)),
    listMarkdownFilePaths: jest.fn(() => ['daily.md']),
    writeFile: jest.fn(async () => undefined),
    deleteFile: jest.fn(async () => undefined),
  };

  const metadata: MetadataPort = {
    getHeadings: jest.fn(async () => [{ line: 0, heading: '学习/英语' }]),
  };

  const fileStat: FileStatPort = {
    stat: jest.fn(async () => ({ ctime: 1, mtime: 2, size: content.length })),
  };

  const themeMatcher: IThemeMatcher = {
    findThemeByPartialMatch: jest.fn((value: string) => (value === '英语' ? '学习/英语' : null)),
  };

  const storage: IPluginStorage = {
    readJSON: jest.fn(async () => null),
    writeJSON: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };

  return new DataStore(vault, metadata, fileStat, themeMatcher, storage);
}

describe('DataStore theme semantics', () => {
  it('does not use current heading as theme fallback for Record Blocks', async () => {
    const taskImplicit = encodeRecordBlock({
      recordId: 'task.01J00000000000000000000051', coreBlock: 'task',
      fields: { status: 'open', content: '没有显式主题的任务' },
    });
    const taskExplicit = encodeRecordBlock({
      recordId: 'task.01J00000000000000000000052', coreBlock: 'task',
      fields: { status: 'open', content: '有显式主题的任务', themePath: '英语' },
    });
    const blockImplicit = encodeRecordBlock({
      recordId: 'rec.01J00000000000000000000053', coreBlock: 'thought',
      fields: { 内容: '没有显式主题的块' },
    });
    const blockExplicit = encodeRecordBlock({
      recordId: 'rec.01J00000000000000000000054', coreBlock: 'thought',
      fields: { 主题: '英语', 内容: '有显式主题的块' },
    });
    const store = createDataStoreForContent(['# 学习/英语', taskImplicit, taskExplicit, blockImplicit, blockExplicit].join('\n'));

    const items = await store.scanFileByPath('daily.md');
    expect(items).toHaveLength(4);

    const implicitTask = items.find((item) => item.id === 'task.01J00000000000000000000051')!;
    expect(implicitTask.header).toBe('学习/英语');
    expect(implicitTask.theme).toBeUndefined();
    expect(implicitTask.themePath).toBeUndefined();

    const explicitTask = items.find((item) => item.id === 'task.01J00000000000000000000052')!;
    expect(explicitTask.header).toBe('学习/英语');
    expect(explicitTask.theme).toBe('学习/英语');
    expect(explicitTask.themePath).toBe('学习/英语');
    expect(explicitTask.rootTheme).toBe('学习');
    expect(explicitTask.leafTheme).toBe('英语');

    const implicitBlock = items.find((item) => item.id === 'rec.01J00000000000000000000053')!;
    expect(implicitBlock.header).toBe('学习/英语');
    expect(implicitBlock.theme).toBeUndefined();
    expect(implicitBlock.themePath).toBeUndefined();

    const explicitBlock = items.find((item) => item.id === 'rec.01J00000000000000000000054')!;
    expect(explicitBlock.header).toBe('学习/英语');
    expect(explicitBlock.theme).toBe('学习/英语');
    expect(explicitBlock.themePath).toBe('学习/英语');
  });
});
