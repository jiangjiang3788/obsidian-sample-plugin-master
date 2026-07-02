import {
  buildExcelColumnWidthStyle,
  getExcelColumnBadge,
  getExcelColumnTitle,
  getExcelColumnWidth,
  parseExcelClipboardMatrix,
  resolveExcelNavigationPosition,
} from '@/features/settings/views/runtime/excel-view/ExcelGridModel';

const editableColumn = {
  key: 'title',
  canonicalField: 'title',
  label: 'Title',
  editable: true,
  editorKind: 'text',
  commitMode: 'inline',
  dangerLevel: 'low',
} as any;

describe('ExcelGridModel', () => {
  it('normalizes column titles, badges and widths', () => {
    expect(getExcelColumnBadge(editableColumn, true)).toBe('可编辑');
    expect(getExcelColumnBadge({ ...editableColumn, dangerLevel: 'medium' }, true)).toBe('谨慎');
    expect(getExcelColumnBadge(editableColumn, false)).toBe('只读');
    expect(getExcelColumnTitle(editableColumn, true)).toContain('双击单元格');
    expect(getExcelColumnTitle({ ...editableColumn, editable: false, readonlyReason: '锁定' }, true)).toBe('锁定');
    expect(getExcelColumnWidth({ ...editableColumn, canonicalField: 'content' })).toBe(240);
    expect(getExcelColumnWidth(editableColumn, 12)).toBe(80);
    expect(buildExcelColumnWidthStyle(123)).toEqual({ width: '123px', minWidth: '123px', maxWidth: '123px' });
  });

  it('parses clipboard matrix and resolves navigation positions', () => {
    expect(parseExcelClipboardMatrix('a\tb\n1\t2\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseExcelClipboardMatrix('')).toEqual([['']]);
    expect(resolveExcelNavigationPosition({ rowIndex: 1, colIndex: 1 }, 'up', 3, 3)).toEqual({ rowIndex: 0, colIndex: 1 });
    expect(resolveExcelNavigationPosition({ rowIndex: 0, colIndex: 0 }, 'previous', 3, 3)).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(resolveExcelNavigationPosition({ rowIndex: 2, colIndex: 2 }, 'next', 3, 3)).toEqual({ rowIndex: 2, colIndex: 2 });
  });
});
