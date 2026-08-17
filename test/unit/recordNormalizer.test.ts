import type { RecordViewItem } from '../../src/core/records/RecordEntity';
import { normalizeRecordItem } from '../../src/core/records/RecordNormalizer';

const baseItem = (overrides: Partial<RecordViewItem> = {}): RecordViewItem => ({
  id: 'task.01J00000000000000000000003',
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




  it('Goal hierarchy derives root/leaf only from goalPath', () => {
    const item = normalizeRecordItem(baseItem({ goalPath: '照顾好自己/健康/睡眠', header: '错误/标题' }), { filePath: 'x.md' } as any);
    expect(item.goalPath).toBe('照顾好自己/健康/睡眠');
    expect(item.rootGoal).toBe('照顾好自己');
    expect(item.leafGoal).toBe('睡眠');
  });

});
