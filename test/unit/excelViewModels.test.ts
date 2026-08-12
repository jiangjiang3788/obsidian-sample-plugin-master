import {
  addExcelSetValue,
  buildExcelCellCommitPlan,
  buildExcelFillDragBatchEdits,
  buildExcelSingleCellEditPlan,
  removeExcelSetValue,
  uniqueExcelKeys,
} from '@/features/views/runtime/excel-view/ExcelCellEditingModel';
import {
  buildExcelCellUiState,
  getExcelCellSaveState,
  getExcelReadonlyTitle,
  getExcelTypedInputProps,
  resolveExcelCellEditorKeyAction,
  resolveExcelCellKeyAction,
} from '@/features/views/runtime/excel-view/ExcelCellModel';
import {
  addExcelColumnField,
  buildExcelColumnAvailableOptions,
  buildExcelColumnMenuModel,
  moveExcelColumnField,
  moveExcelColumnFieldToEnd,
  moveExcelColumnFieldToStart,
  removeExcelColumnField,
  reorderExcelColumnFieldsByDrop,
} from '@/features/views/runtime/excel-view/ExcelColumnToolbarModel';
import {
  buildExcelColumnWidthStyle,
  getExcelColumnBadge,
  getExcelColumnTitle,
  getExcelColumnWidth,
  parseExcelClipboardMatrix,
  resolveExcelNavigationPosition,
} from '@/features/views/runtime/excel-view/ExcelGridModel';
import {
  buildExcelContentModeButtonTitle,
  buildExcelViewRenderModel,
  getNextExcelContentDisplayMode,
  normalizeExcelColumnWidth,
  normalizeExcelColumnWidths,
  normalizeExcelContentDisplayMode,
} from '@/features/views/runtime/excel-view/ExcelViewModel';

const baseCell = {
  item: { id: '1', title: 'One' },
  itemId: '1',
  field: 'title',
  canonicalField: 'title',
  value: 'One',
  displayValue: 'One',
  editorValue: 'One',
  policy: {
    editable: true,
    commitMode: 'inline',
    editorKind: 'text',
    dangerLevel: 'low',
    canonicalField: 'title',
  },
} as any;

describe('ExcelCellEditingModel', () => {
  it('updates immutable key sets', () => {
    const empty = new Set<string>();
    const withKey = addExcelSetValue(empty, 'a');
    expect(Array.from(empty)).toEqual([]);
    expect(Array.from(withKey)).toEqual(['a']);
    expect(Array.from(removeExcelSetValue(withKey, 'a'))).toEqual([]);
    expect(uniqueExcelKeys(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('builds single edit validation plan', () => {
    const plan = buildExcelSingleCellEditPlan(baseCell, 'Next');
    expect(plan.key).toBe('1::title');
    expect(plan.validationMessage).toBeUndefined();
    expect(plan.nextValue).toBe('Next');
  });

  it('builds batch commit plan and skips readonly cells', () => {
    const readonlyCell = {
      ...baseCell,
      itemId: '2',
      policy: { ...baseCell.policy, editable: false, reason: '锁定' },
    };
    const plan = buildExcelCellCommitPlan([
      { cell: baseCell, editorValue: 'A' },
      { cell: readonlyCell, editorValue: 'B' },
    ], 'paste');
    expect(plan.valid.map(edit => edit.key)).toEqual(['1::title']);
    expect(plan.keys).toEqual(['1::title']);
    expect(plan.reason).toBe('paste');
  });

  it('builds fill drag edits for same canonical field only', () => {
    const sameField = { ...baseCell, itemId: '2' };
    const otherField = { ...baseCell, itemId: '3', canonicalField: 'status', field: 'status' };
    const edits = buildExcelFillDragBatchEdits(baseCell, [baseCell, sameField, otherField]);
    expect(edits).toHaveLength(1);
    expect(edits[0].cell.itemId).toBe('2');
    expect(edits[0].editorValue).toBe('One');
  });
});

const cell = {
  item: { id: '1', title: 'Hello' },
  itemId: '1',
  field: 'title',
  canonicalField: 'title',
  value: 'Hello',
  displayValue: 'Hello',
  editorValue: 'Hello',
  policy: {
    editable: true,
    commitMode: 'inline',
    editorKind: 'text',
    dangerLevel: 'low',
    canonicalField: 'title',
  },
} as any;

describe('ExcelCellModel', () => {
  it('builds cell ui state', () => {
    const state = buildExcelCellUiState({ cell, selected: true, canCommit: true });
    expect(state.editable).toBe(true);
    expect(state.readonly).toBe(false);
    expect(state.cellKey).toBe('1::title');
    expect(state.className).toContain('is-selected');
    expect(state.title).toContain('双击');
  });

  it('resolves keyboard actions', () => {
    expect(resolveExcelCellEditorKeyAction({ key: 'Escape', descriptorTag: 'input' })).toBe('cancel-edit');
    expect(resolveExcelCellEditorKeyAction({ key: 'Enter', descriptorTag: 'textarea', shiftKey: true })).toBe('none');
    expect(resolveExcelCellEditorKeyAction({ key: 'Enter', descriptorTag: 'textarea' })).toBe('commit-edit');
    expect(resolveExcelCellKeyAction({ key: 'ArrowDown', editing: false, editable: true, fillDragging: false })).toEqual({ type: 'navigate', direction: 'down' });
    expect(resolveExcelCellKeyAction({ key: 'Tab', shiftKey: true, editing: false, editable: true, fillDragging: false })).toEqual({ type: 'navigate', direction: 'previous' });
    expect(resolveExcelCellKeyAction({ key: 'F2', editing: false, editable: true, fillDragging: false })).toEqual({ type: 'start-edit' });
    expect(resolveExcelCellKeyAction({ key: 'Escape', editing: false, editable: true, fillDragging: true })).toEqual({ type: 'cancel-fill-drag' });
  });

  it('normalizes editor props and save state', () => {
    expect(getExcelReadonlyTitle()).toContain('不可在 Excel');
    expect(getExcelTypedInputProps('rating')).toEqual({ step: 1, min: 0, max: 5 });
    expect(getExcelTypedInputProps('number')).toEqual({ step: 'any' });
    expect(getExcelCellSaveState({ pending: true, saved: false })).toBe('pending');
    expect(getExcelCellSaveState({ pending: false, saved: false, error: 'bad' })).toBe('error');
    expect(getExcelCellSaveState({ pending: false, saved: true })).toBe('saved');
  });
});

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

describe('ExcelViewModel', () => {
  it('normalizes column widths and content display mode', () => {
    expect(normalizeExcelColumnWidth(Number.NaN)).toBe(160);
    expect(normalizeExcelColumnWidth(20)).toBe(80);
    expect(normalizeExcelColumnWidth(800)).toBe(640);
    expect(normalizeExcelColumnWidths({ content: 188.7, title: -1 })).toEqual({ content: 189, title: 80 });
    expect(normalizeExcelContentDisplayMode('fullMarkdown')).toBe('fullMarkdown');
    expect(normalizeExcelContentDisplayMode('unknown')).toBe('previewText');
    expect(getNextExcelContentDisplayMode('fullMarkdown')).toBe('previewText');
  });

  it('builds render model and content mode title', () => {
    const model = buildExcelViewRenderModel({
      items: [{ id: '1', content: 'hello', fields: { score: 3 }, modified: 'm1' } as any],
      fields: ['content', 'score'],
      availableFields: ['content', 'score'],
      excelConfig: { columnWidths: { content: 200 }, contentDisplayMode: 'fullMarkdown' },
    });

    expect(model.displayFields).toEqual(['content', 'score']);
    expect(model.columns.map(column => column.canonicalField)).toContain('content');
    expect(model.persistedColumnWidths).toEqual({ content: 200 });
    expect(model.persistedContentDisplayMode).toBe('fullMarkdown');
    expect(model.hasContentColumn).toBe(true);
    expect(model.itemSignature).toBe('1:m1');
    expect(buildExcelContentModeButtonTitle({ hasContentColumn: false, excelConfigSaving: false, isFullMarkdownContent: false })).toContain('未显示内容字段');
    expect(buildExcelContentModeButtonTitle({ hasContentColumn: true, excelConfigSaving: true, isFullMarkdownContent: false })).toContain('正在保存');
  });
});
