import {
  getItemFilePath,
  getItemLineNumber,
  inferCreatedItemType,
  locateCreatedRecord,
  parseItemLocator,
} from '@/app/usecases/recordInput/locator';

describe('recordInput locator helpers', () => {
  it('parses item locator path and line number', () => {
    expect(parseItemLocator('Daily/2026-05-13.md#42')).toEqual({
      path: 'Daily/2026-05-13.md',
      lineNo: 42,
    });
  });

  it('prefers explicit file metadata over parsing the item id', () => {
    const item = {
      id: 'Old/path.md#8',
      file: { path: 'New/path.md', line: 12 },
    } as any;

    expect(getItemFilePath(item)).toBe('New/path.md');
    expect(getItemLineNumber(item)).toBe(12);
  });

  it('infers created item type from output template shape', () => {
    expect(inferCreatedItemType('- [ ] 写日报')).toBe('task');
    expect(inferCreatedItemType('<!-- start -->\n内容\n<!-- end -->')).toBe('block');
    expect(inferCreatedItemType('普通文本')).toBe('unknown');
  });

  it('locates the new record by diffing item signatures and scoring metadata', () => {
    const beforeItems = [
      {
        id: 'Daily/2026-05-13.md#1',
        type: 'task',
        title: '已有任务',
        content: '- [ ] 已有任务',
        file: { path: 'Daily/2026-05-13.md', line: 1 },
      },
    ] as any[];
    const afterItems = [
      ...beforeItems,
      {
        id: 'Daily/2026-05-13.md#8',
        type: 'task',
        title: '写日报',
        content: '- [ ] 写日报',
        templateId: 'task-template',
        templateSourceType: 'block',
        categoryKey: 'Task',
        file: { path: 'Daily/2026-05-13.md', line: 8 },
      },
    ] as any[];

    const created = locateCreatedRecord(beforeItems, afterItems, {
      outputContent: '- [ ] 写日报',
      normalizedFormData: { 标题: '写日报' },
      templateId: 'task-template',
      templateSourceType: 'block',
      blockCategoryKey: 'Task',
      itemTypeHint: 'task',
      appendMode: 'append',
      beforeMaxLine: 1,
    });

    expect(created?.id).toBe('Daily/2026-05-13.md#8');
  });
});
