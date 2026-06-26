import {
  addExcelColumnField,
  buildExcelColumnAvailableOptions,
  buildExcelColumnMenuModel,
  moveExcelColumnField,
  moveExcelColumnFieldToEnd,
  moveExcelColumnFieldToStart,
  removeExcelColumnField,
  reorderExcelColumnFieldsByDrop,
} from '@/shared/ui/views/excel-view/ExcelColumnToolbarModel';

describe('ExcelColumnToolbarModel', () => {
  it('moves, adds and removes fields without mutating the source', () => {
    const fields = ['title', 'status', 'content'];
    expect(moveExcelColumnField(fields, 2, 0)).toEqual(['content', 'title', 'status']);
    expect(fields).toEqual(['title', 'status', 'content']);
    expect(moveExcelColumnFieldToStart(fields, 'content')).toEqual(['content', 'title', 'status']);
    expect(moveExcelColumnFieldToEnd(fields, 'title')).toEqual(['status', 'content', 'title']);
    expect(addExcelColumnField(fields, 'rating')).toEqual(['title', 'status', 'content', 'rating']);
    expect(addExcelColumnField(fields, 'status')).toBe(fields);
    expect(removeExcelColumnField(fields, 'status')).toEqual(['title', 'content']);
    expect(removeExcelColumnField(['title'], 'title')).toEqual(['title']);
  });

  it('builds available field options with groups', () => {
    const options = buildExcelColumnAvailableOptions(
      ['title'],
      ['title', 'status', 'content'],
      field => `字段:${field}`,
      field => field === 'content' ? '正文' : '基础',
    );
    expect(options).toEqual([
      { value: 'status', label: '字段:status', group: '基础' },
      { value: 'content', label: '字段:content', group: '正文' },
    ]);
  });

  it('builds menu model and drop reorder result', () => {
    const fields = ['title', 'status', 'content'];
    const menu = buildExcelColumnMenuModel(
      { field: 'status', x: 1, y: 2 },
      fields,
      true,
      false,
      field => field.toUpperCase(),
      field => field === 'status' ? '基础' : undefined,
    );
    expect(menu).toMatchObject({
      field: 'status',
      label: 'STATUS',
      group: '基础',
      index: 1,
      canRemove: true,
      canMoveToStart: true,
      canMoveToEnd: true,
    });
    expect(reorderExcelColumnFieldsByDrop(fields, 'content', 'title')).toEqual(['content', 'title', 'status']);
  });
});
