/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F090/unit
 */
import type { RecordViewItem } from '@core/types/public';
import { buildBlockViewRenderModel } from '@/features/views/runtime/BlockViewModel';
import { buildTableViewRenderModel } from '@/features/views/runtime/TableViewModel';
import { buildExcelViewRenderModel } from '@/features/views/runtime/excel-view/ExcelViewModel';
import { resolveTimelineTasks } from '@/features/views/runtime/TimelineView/TimelineViewModel';
import { filterEventTimelineItemsByDateRange } from '@/features/views/runtime/EventTimelineView/EventTimelineViewModel';
import { buildStatisticsGoalBuckets, resolveStatisticsBucketAccessor } from '@/features/views/runtime/StatisticsView/StatisticsViewModel';
import { buildHeatmapViewModel } from '@/features/views/models/heatmapViewModel';
import { buildProgressViewRenderModel } from '@/features/views/runtime/ProgressViewModel';
import { buildEnergyViewModel } from '@/features/views/models/energyViewModel';

const RECORD_TYPES = ['task', 'habit', 'plan', 'review', 'thought', 'event', 'blocker', 'milestone', 'energy'] as const;

const items: RecordViewItem[] = RECORD_TYPES.map((recordType, index) => ({
  id: `${recordType}.matrix-${index + 1}`,
  title: `${recordType}-${index + 1}`,
  content: `${recordType} matrix content`,
  tags: [],
  recordType,
  goalPath: '工作/完整回归',
  date: '2026-08-24',
  created: 0,
  modified: 0,
  extra: recordType === 'energy'
    ? { 时间: '10:15', 精力值: 80, 精力档位: 80, 评分模式: 'quick', 记录方式: 'realtime', 时间精度: 'exact' }
    : {},
  ...(recordType === 'task'
    ? {
        status: 'open',
        startAt: '2026-08-24T09:00',
        endAt: '2026-08-24T09:30',
        expectedDurationMinutes: 30,
        file: { path: '01/目标.md', basename: '目标.md' },
        filename: '目标.md',
      }
    : {}),
  ...(recordType === 'energy' ? { startTime: '10:15' } : {}),
})) as RecordViewItem[];

function flattenGroupItems(nodes: any[]): RecordViewItem[] {
  const result: RecordViewItem[] = [];
  for (const node of nodes || []) {
    if (Array.isArray(node?.items)) result.push(...node.items);
    if (Array.isArray(node?.children)) result.push(...flattenGroupItems(node.children));
  }
  return result;
}

function flattenTableMatrix(matrix: Record<string, Record<string, RecordViewItem[]>>): RecordViewItem[] {
  return Object.values(matrix).flatMap((columns) => Object.values(columns).flat());
}

describe('RecordType x View compatibility matrix', () => {
  it('BlockView keeps all nine user Record types when grouped by type', () => {
    const model = buildBlockViewRenderModel({ items, effectiveGroupFields: ['recordType'] });
    expect(new Set(flattenGroupItems(model.groupTree).map((item) => item.recordType))).toEqual(new Set(RECORD_TYPES));
  });

  it('TableView keeps all nine user Record types in a configured matrix', () => {
    const model = buildTableViewRenderModel({ items, rowField: 'recordType', colField: 'goalPath' });
    expect(new Set(flattenTableMatrix(model.matrix).map((item) => item.recordType))).toEqual(new Set(RECORD_TYPES));
  });

  it('ExcelView keeps all nine user Record types in ordered rows', () => {
    const model = buildExcelViewRenderModel({ items, fields: ['recordType', 'goalPath', 'date', 'content'] });
    expect(model.orderedItems.map((item) => item.recordType)).toEqual(items.map((item) => item.recordType));
  });

  it('TimelineView intentionally projects only Task from the nine user Record types', () => {
    const projected = resolveTimelineTasks(items, items);
    expect(projected).toHaveLength(1);
    expect(projected[0]?.taskRecordId).toBe(items[0]?.id);
  });

  it('EventTimelineView accepts every user Record with a valid configured date field', () => {
    const filtered = filterEventTimelineItemsByDateRange({
      items,
      dateRange: [new Date('2026-08-24T00:00:00'), new Date('2026-08-24T23:59:59')],
      timeField: 'date',
    });
    expect(new Set(filtered.map((item) => item.recordType))).toEqual(new Set(RECORD_TYPES));
  });

  it('StatisticsView bucket selection is Goal-based rather than RecordType-based', () => {
    const bucket = resolveStatisticsBucketAccessor([]);
    expect(new Set(items.map(bucket))).toEqual(new Set(['工作']));
    expect(buildStatisticsGoalBuckets({ items, goals: [] }).map((row) => row.name)).toEqual(['工作']);
  });

  it('HeatmapView accepts all dated, Goal-bound user Record types', () => {
    const model = buildHeatmapViewModel({
      items,
      module: { id: 'heatmap-matrix', title: '打卡', viewType: 'HeatmapView', viewConfig: {} } as any,
      inputSettings: {} as any,
      goals: [],
      goalSettings: { goals: [], goalTemplates: [] } as any,
    });
    expect(model.goalGroups.reduce((sum, group) => sum + group.count, 0)).toBe(RECORD_TYPES.length);
  });

  it('ProgressView counts eight non-Energy types as progress and keeps Energy in its separate summary', () => {
    const model = buildProgressViewRenderModel({ items, module: { viewConfig: {} }, goals: [] });
    expect(model.goalCards).toHaveLength(1);
    expect(model.goalCards[0]?.itemCount).toBe(8);
    expect(model.goalCards[0]?.energySummary?.count).toBe(1);
    expect(model.goalCards[0]?.recordTypeCounts.energy).toBe(1);
  });

  it('EnergyView uses Energy as the primary sample instead of treating all nine types as Energy', () => {
    const model = buildEnergyViewModel({
      items,
      records: items,
      module: { viewConfig: {} },
      currentView: '天',
      dateRange: [new Date('2026-08-24T00:00:00'), new Date('2026-08-24T23:59:59')],
      goals: [],
    });
    expect(model.goalPanels).toHaveLength(1);
    expect(model.goalPanels[0]?.summary.count).toBe(1);
  });
});
