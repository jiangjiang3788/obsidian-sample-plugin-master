import type { RecordViewItem } from '../../src/core/records/RecordEntity';
import { normalizeRecordItem } from '../../src/core/records/RecordNormalizer';

const baseItem = (overrides: Partial<RecordViewItem> = {}): RecordViewItem => ({
  id: 'task.01J00000000000000000000003',
  schemaVersion: 2,
  coreBlock: 'task',
  status: 'open',
  title: '任务',
  content: '任务',
  tags: [],
  created: 0,
  modified: 0,
  categoryKey: '任务',
  extra: {},
  ...overrides,
});

describe('RecordNormalizer', () => {
  it('补齐文件字段、搜索字段和 heading 标签', () => {
    const item = normalizeRecordItem(baseItem({ tags: ['任务'] }), {
      filePath: 'Notes/daily.md',
      fileName: 'daily',
      parentFolder: 'Notes',
      created: 1,
      modified: 2,
      line: 3,
      header: '工作',
      sectionTags: ['项目/插件'],
    });

    expect(item.created).toBe(1);
    expect(item.modified).toBe(2);
    expect(item.file?.path).toBe('Notes/daily.md');
    expect(item.file?.line).toBe(3);
    expect(item.file?.basename).toBe('daily');
    expect(item.header).toBe('工作');
    expect(item.tags).toEqual(['项目/插件', '任务']);
    expect((item as any).titleLower).toBe('任务');
  });

  it('header 永远不会生成 themePath', () => {
    const item = normalizeRecordItem(baseItem(), {
      filePath: 'Notes/daily.md',
      fileName: 'daily',
      parentFolder: 'Notes',
      created: 1,
      modified: 2,
      line: 3,
      header: '健康/睡眠',
    });

    expect(item.header).toBe('健康/睡眠');
    expect(item.theme).toBeUndefined();
    expect(item.themePath).toBeUndefined();
    expect(item.rootTheme).toBeUndefined();
    expect(item.leafTheme).toBeUndefined();
  });

  it('显式 theme 才派生 themePath/rootTheme/leafTheme', () => {
    const item = normalizeRecordItem(baseItem({ theme: '健康/睡眠' }), {
      filePath: 'Notes/daily.md',
      fileName: 'daily',
      parentFolder: 'Notes',
      created: 1,
      modified: 2,
      line: 3,
      header: '只是章节',
    });

    expect(item.theme).toBe('健康/睡眠');
    expect(item.themePath).toBe('健康/睡眠');
    expect(item.rootTheme).toBe('健康');
    expect(item.leafTheme).toBe('睡眠');
  });
});
