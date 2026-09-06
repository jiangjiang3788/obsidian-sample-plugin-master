/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F012/regression
 * @covers F012/unit
 */
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
    const item = normalizeRecordItem(baseItem({ goalPath: '照顾好自己/健康/睡眠', header: '错误/标题' }), { filePath: 'x.md' } as Parameters<typeof normalizeRecordItem>[1]);
    expect(item.goalPath).toBe('照顾好自己/健康/睡眠');
    expect(item.rootGoal).toBe('照顾好自己');
    expect(item.leafGoal).toBe('睡眠');
  });

  it('任务完成后默认日期保持计划事实稳定，不跳到完成日期', () => {
    const item = normalizeRecordItem(baseItem({
      status: 'done',
      scheduledAt: '2026-08-20T09:00',
      dueAt: '2026-08-21T18:00',
      completedAt: '2026-08-22T10:30',
      doneDate: '2026-08-22',
    }), { filePath: 'x.md' } as Parameters<typeof normalizeRecordItem>[1]);

    expect(item.date).toBe('2026-08-20T09:00');
    expect(item.dateSource).toBe('scheduled');
  });

  it('没有计划时间时 Task 默认日期优先截止/旧开始/创建，完成时间只做最后兼容兜底', () => {
    const due = normalizeRecordItem(baseItem({
      status: 'done', dueAt: '2026-08-21T18:00', completedAt: '2026-08-22T10:30',
    }), { filePath: 'x.md' } as Parameters<typeof normalizeRecordItem>[1]);
    expect(due.dateSource).toBe('due');

    const created = normalizeRecordItem(baseItem({
      status: 'done', createdAt: '2026-08-19T08:00', completedAt: '2026-08-22T10:30',
    }), { filePath: 'x.md' } as Parameters<typeof normalizeRecordItem>[1]);
    expect(created.dateSource).toBe('created');
  });

});
