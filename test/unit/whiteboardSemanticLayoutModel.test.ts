/**
 * @covers F149/unit
 * @covers F149/regression
 * @covers F153/unit
 * @covers F153/regression
 */
import type { RecordViewItem } from '@core/types/public';
import type { WhiteboardItem } from '@core/whiteboard/public';
import { GOAL_TYPE_TIME_LAYOUT_SPEC, arrangeWhiteboardItemsBySpec } from '@/features/whiteboard/WhiteboardSemanticLayoutModel';

function record(id: string, recordType: string, goalPath: string, date?: string): RecordViewItem {
  return { id, recordType, title: id, content: id, tags: [], goalPath, date, created: 0, modified: 0, extra: {} } as RecordViewItem;
}
function item(id: string, recordId: string, x = 0, y = 0): WhiteboardItem { return { id, recordId, x, y, zIndex: 1 }; }

describe('Whiteboard 1.3.3 目标 × 类型 × 时间布局', () => {
  test('第一版 UI 固定 Goal 分区、Record Type 横轴、月时间纵轴，同时保留通用 LayoutSpec 接口', () => {
    expect(GOAL_TYPE_TIME_LAYOUT_SPEC).toEqual({
      id: 'goal-type-time',
      groupBy: 'goal',
      x: { field: 'recordType', order: 'canonical' },
      y: { field: 'time', order: 'asc', bucket: 'month' },
      cellLayout: 'grid',
    });
  });

  test('一个 Goal 一块；同 Goal 下类型决定 x、月份决定 y，同单元格多卡用网格不重叠', () => {
    const records = [
      record('a', 'thought', '目标 A', '2026-01-04'),
      record('b', 'task', '目标 A', '2026-01-08'),
      record('c', 'thought', '目标 A', '2026-02-09'),
      record('d', 'thought', '目标 A', '2026-01-19'),
      record('e', 'task', '目标 B', '2026-01-03'),
    ];
    const items = records.map((entry, index) => item(`item-${entry.id}`, entry.id, index * 15, index * 11));
    const result = arrangeWhiteboardItemsBySpec(items, new Map(records.map((entry) => [entry.id, entry])));
    const moves = new Map(result.moves.map((move) => [move.itemId, move.position]));
    const a = moves.get('item-a')!; const b = moves.get('item-b')!; const c = moves.get('item-c')!; const d = moves.get('item-d')!; const e = moves.get('item-e')!;
    expect(a.x).not.toBe(b.x); // 类型横向
    expect(c.y).toBeGreaterThan(a.y); // 时间纵向
    expect(d.x).not.toBe(a.x); // 同 cell 内网格
    expect(e.y).toBeGreaterThan(c.y); // 第二个 Goal 在下一块
    const goalGuides = result.guides.filter((guide) => guide.kind === 'goal');
    expect(goalGuides.map((guide) => guide.label)).toEqual(['目标 A', '目标 B']);
    expect(goalGuides[0].itemIds).toHaveLength(4);
  });

  test('记录类型横轴统一使用全局展示顺序，而不是 Schema 数组顺序或中文排序', () => {
    const records = [
      record('plan', 'plan', '目标 A', '2026-01-01'),
      record('habit', 'habit', '目标 A', '2026-01-01'),
      record('energy', 'energy', '目标 A', '2026-01-01'),
      record('task', 'task', '目标 A', '2026-01-01'),
    ];
    const result = arrangeWhiteboardItemsBySpec(
      records.map((entry) => item(`item-${entry.id}`, entry.id)),
      new Map(records.map((entry) => [entry.id, entry])),
    );
    const labels = result.guides
      .filter((guide) => guide.kind === 'recordType' && guide.id.includes(':x:'))
      .map((guide) => guide.label);
    expect(labels).toEqual(['任务', '精力', '打卡', '计划']);
  });

  test('底层 LayoutSpec 真正驱动 group/x/y，可留给后续配置 UI，而不是只换一个接口名字', () => {
    const records = [record('a', 'thought', '目标 A', '2026-01-04'), record('b', 'thought', '目标 B', '2026-01-08'), record('c', 'task', '目标 A', '2026-01-09')];
    const result = arrangeWhiteboardItemsBySpec(
      records.map((entry) => item(`item-${entry.id}`, entry.id)),
      new Map(records.map((entry) => [entry.id, entry])),
      { id: 'future-preview', groupBy: 'recordType', x: { field: 'goal', order: 'asc' }, y: { field: 'time', order: 'asc', bucket: 'month' }, cellLayout: 'grid' },
    );
    const groupGuides = result.guides.filter((guide) => guide.kind === 'recordType' && guide.id.startsWith('group:') && !guide.id.includes(':x:') && !guide.id.includes(':y:'));
    expect(groupGuides).toHaveLength(2);
    expect(result.guides.some((guide) => guide.kind === 'goal' && guide.id.includes(':x:'))).toBe(true);
  });

  test('时间轴优先使用 Record 的 date/dateMs，而不是记录创建时间；月份分桶不受本机时区影响', () => {
    const a = { ...record('dated', 'thought', '目标 A', '2026-01-01'), created: Date.parse('2030-12-31T23:00:00Z') } as RecordViewItem;
    const result = arrangeWhiteboardItemsBySpec([item('item-dated', a.id)], new Map([[a.id, a]]));
    expect(result.guides.some((guide) => guide.kind === 'time' && guide.label === '2026-01')).toBe(true);
    expect(result.guides.some((guide) => guide.kind === 'time' && guide.label === '2030-12')).toBe(false);
  });

  test('缺 Goal / 时间仍有稳定区域，不丢记录', () => {
    const records = [record('a', 'thought', '', undefined), record('b', 'task', '', '2026-03-01')];
    const result = arrangeWhiteboardItemsBySpec(
      [item('item-a', 'a'), item('item-b', 'b')],
      new Map(records.map((entry) => [entry.id, entry])),
    );
    expect(result.moves).toHaveLength(2);
    expect(result.guides.some((guide) => guide.kind === 'goal' && guide.label === '未归属目标')).toBe(true);
    expect(result.guides.some((guide) => guide.kind === 'time' && guide.label === '无时间')).toBe(true);
  });
});
