import { DataStore } from '@/core/services/DataStore';
import type { FileStatPort } from '@/core/ports/FileStatPort';
import type { MetadataPort } from '@/core/ports/MetadataPort';
import type { VaultPort } from '@/core/ports/VaultPort';
import type { IPluginStorage } from '@/core/services/StorageService';
import type { IThemeMatcher } from '@/core/types/theme';

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
  it('does not use current heading as theme fallback for tasks or blocks', async () => {
    const store = createDataStoreForContent([
      '# 学习/英语',
      '- [ ] 没有显式主题的任务',
      '- [ ] 有显式主题的任务 (主题::英语)',
      '<!-- start -->',
      '内容:: 没有显式主题的块',
      '<!-- end -->',
      '<!-- start -->',
      '主题:: 英语',
      '内容:: 有显式主题的块',
      '<!-- end -->',
    ].join('\n'));

    const items = await store.scanFileByPath('daily.md');

    expect(items).toHaveLength(4);

    const implicitTask = items.find((item) => item.title.includes('没有显式主题的任务'))!;
    expect(implicitTask.header).toBe('学习/英语');
    expect(implicitTask.theme).toBeUndefined();
    expect(implicitTask.themePath).toBeUndefined();
    expect(implicitTask.rootTheme).toBeUndefined();
    expect(implicitTask.leafTheme).toBeUndefined();

    const explicitTask = items.find((item) => item.title.includes('有显式主题的任务'))!;
    expect(explicitTask.header).toBe('学习/英语');
    expect(explicitTask.theme).toBe('学习/英语');
    expect(explicitTask.themePath).toBe('学习/英语');
    expect(explicitTask.rootTheme).toBe('学习');
    expect(explicitTask.leafTheme).toBe('英语');

    const implicitBlock = items.find((item) => item.content.includes('没有显式主题的块'))!;
    expect(implicitBlock.header).toBe('学习/英语');
    expect(implicitBlock.theme).toBeUndefined();
    expect(implicitBlock.themePath).toBeUndefined();

    const explicitBlock = items.find((item) => item.content.includes('有显式主题的块'))!;
    expect(explicitBlock.header).toBe('学习/英语');
    expect(explicitBlock.theme).toBe('学习/英语');
    expect(explicitBlock.themePath).toBe('学习/英语');
  });
});
