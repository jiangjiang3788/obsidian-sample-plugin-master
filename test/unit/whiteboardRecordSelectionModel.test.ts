/**
 * @covers F099/unit
 * @covers F099/regression
 */
import type { RecordViewItem } from '@core/types/public';
import {
  pruneWhiteboardRecordSelection,
  resolveWhiteboardSourceDragRecords,
  selectAllWhiteboardRecordIds,
  toggleWhiteboardRecordSelection,
} from '@/features/whiteboard/WhiteboardRecordSelectionModel';

function record(id: string): RecordViewItem {
  return { id, coreBlock: 'thought', title: id, content: id, tags: [], categoryKey: 'thought', created: 0, modified: 0, extra: {} } as RecordViewItem;
}

describe('白板 Record Source 多选模型 1.1.6', () => {
  test('全选针对完整 matched results，不受前 80 条渲染 cap 限制', () => {
    const records = Array.from({ length: 9354 }, (_, index) => record(`rec-${index}`));
    expect(selectAllWhiteboardRecordIds(records).size).toBe(9354);
  });

  test('查询变化或 Record 已进入白板时会从当前选择中裁掉不可用 ID', () => {
    const selected = new Set(['a', 'b', 'c']);
    expect(Array.from(pruneWhiteboardRecordSelection(selected, [record('b'), record('c'), record('d')]))).toEqual(['b', 'c']);
    expect(Array.from(toggleWhiteboardRecordSelection(selected, 'b'))).toEqual(['a', 'c']);
  });

  test('拖已选行携带整组选中结果；拖未选行仍只拖这一条', () => {
    const results = [record('a'), record('b'), record('c')];
    const selected = new Set(['a', 'c']);
    expect(resolveWhiteboardSourceDragRecords(results[2], selected, results).map((item) => item.id)).toEqual(['a', 'c']);
    expect(resolveWhiteboardSourceDragRecords(results[1], selected, results).map((item) => item.id)).toEqual(['b']);
  });
});
