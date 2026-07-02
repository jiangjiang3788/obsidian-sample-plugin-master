import {
  addExcelSetValue,
  buildExcelCellCommitPlan,
  buildExcelFillDragBatchEdits,
  buildExcelSingleCellEditPlan,
  removeExcelSetValue,
  uniqueExcelKeys,
} from '@/features/settings/views/runtime/excel-view/ExcelCellEditingModel';

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
