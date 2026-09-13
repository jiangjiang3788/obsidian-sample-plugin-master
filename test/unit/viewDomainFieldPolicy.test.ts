/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F090/unit
 * @covers F104/unit
 */
import { normalizeViewFilters, normalizeViewGroupFields, normalizeDisplayFields, normalizeViewConfigDomain, readFieldValue } from '@/core/public';
import type { RecordViewItem } from '@/core/public';

describe('view domain field policy', () => {
  it('normalizes explicit Record Type labels to canonical values', () => {
    expect(normalizeViewFilters([{ field: '记录类型', op: '=', value: '打卡' }]))
      .toEqual([{ field: 'recordType', op: '=', value: 'habit' }]);
    expect(normalizeViewFilters([{ field: 'recordType', op: '=', value: '事件' }]))
      .toEqual([{ field: 'recordType', op: '=', value: 'event' }]);
  });

  it('keeps canonical Task status filters canonical', () => {
    expect(normalizeViewFilters([
      { field: 'recordType', op: '=', value: 'task', logic: 'and' },
      { field: 'status', op: '=', value: 'done' },
    ])).toEqual([
      { field: 'recordType', op: '=', value: 'task', logic: 'and' },
      { field: 'status', op: '=', value: 'done' },
    ]);
  });

  it('keeps current Goal/content fields and canonical grouping fields', () => {
    expect(normalizeDisplayFields(['goalPath', 'content'])).toEqual(['goalPath', 'content']);
    expect(normalizeViewGroupFields(['recordType', 'leafGoal'])).toEqual(['recordType', 'leafGoal']);
  });

  it('normalizes current view axes without introducing retired Category fields', () => {
    expect(normalizeViewConfigDomain({ rowField: '记录类型', colField: 'date', groupField: '目标' })).toEqual({
      rowField: 'recordType',
      colField: 'date',
      groupField: 'goalPath',
    });
    expect(normalizeViewConfigDomain({ categories: [], goalPaths: [] })).toEqual({});
    expect(normalizeViewConfigDomain({ dateRole: 'task-completed' })).toEqual({ dateRole: 'task-completed' });
    expect(normalizeViewConfigDomain({ dateRole: 'unknown-time-role' })).toEqual({});
  });

  it('resolves explicit status and structured cadence', () => {
    const item = {
      id: 'task.01J00000000000000000000044', recordType: 'task', status: 'done',
      title: 'done task', content: 'done task', tags: [], created: 0, modified: 0, extra: {},
      seriesId: 'taskseries.01J00000000000000000000044', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' },
    } as RecordViewItem;
    expect(readFieldValue(item, 'status')).toBe('done');
    expect(readFieldValue(item, 'cadence')).toBe('week');
    expect(readFieldValue(item, 'recurrence')).toBe('every week');
  });
});
