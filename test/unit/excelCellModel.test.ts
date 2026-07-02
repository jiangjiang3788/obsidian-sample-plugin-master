import {
  buildExcelCellUiState,
  getExcelCellSaveState,
  getExcelReadonlyTitle,
  getExcelTypedInputProps,
  resolveExcelCellEditorKeyAction,
  resolveExcelCellKeyAction,
} from '@/features/settings/views/runtime/excel-view/ExcelCellModel';

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
