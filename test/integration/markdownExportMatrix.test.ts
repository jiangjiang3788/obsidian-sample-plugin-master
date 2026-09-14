/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F091/error
 * @covers F091/integration
 */
import { exportViewToMarkdown } from '@/core/utils/exportUtils';
import type { RecordViewItem, ViewInstance } from '@/core/types/public';

function item(id: string, recordType: string, extra: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    recordType,
    title: '',
    content: `内容-${id}`,
    filename: '2026-09-12',
    tags: [],
    created: 1,
    modified: 1,
    extra: {},
    ...extra,
  } as RecordViewItem;
}

function view(viewType: ViewInstance['viewType'], extra: Partial<ViewInstance> = {}): ViewInstance {
  return {
    id: `view.${viewType}`,
    parentId: null,
    title: viewType,
    viewType,
    fields: ['primaryText', 'goalPath', 'date'],
    groupFields: [],
    filters: [],
    sort: [],
    viewConfig: {},
    ...extra,
  };
}

describe('P1 Markdown 导出行为矩阵', () => {
  const baseItems = [
    item('thought.1', 'thought', { date: '2026-09-12', goalPath: '武装大脑/了解自我' }),
    item('task.1', 'task', { status: 'done', goalPath: '工作能力/设计', completedAt: '2026-09-12T10:00:00' }),
    item('habit.1', 'habit', { date: '2026-09-12', goalPath: '照顾好自己/喝水', rating: 1 }),
    item('energy.1', 'energy', { date: '2026-09-12', goalPath: '照顾好自己', extra: { 精力值: 72 } }),
  ];

  it.each([
    'BlockView', 'TableView', 'ExcelView', 'TimelineView', 'EventTimelineView',
    'StatisticsView', 'HeatmapView', 'ProgressView', 'EnergyView', 'EisenhowerView',
  ] as ViewInstance['viewType'][])(
    '%s 都能生成无 undefined/null 的可读 Markdown',
    (viewType: ViewInstance['viewType']) => {
      const module = view(viewType, viewType === 'HeatmapView'
        ? { viewConfig: { sourceRecordTypeId: 'core.habit', goalPaths: ['照顾好自己/喝水'] } }
        : viewType === 'StatisticsView'
          ? { viewConfig: { metric: 'recordCount', topN: 10 } }
          : viewType === 'EventTimelineView'
            ? { viewConfig: { timeField: 'date', titleField: 'primaryText', groupByDay: true } }
            : {});
      const markdown = exportViewToMarkdown({
        items: baseItems,
        relatedRecords: baseItems,
        viewInstance: module,
        dateRange: [new Date('2026-09-12T00:00:00'), new Date('2026-09-12T23:59:59')],
      });
      expect(markdown).toContain(`# ${viewType}`);
      expect(markdown).not.toMatch(/\bundefined\b|\bnull\b/);
    },
  );

  it('Block/Table 分组复用 View 的 groupFields / rowField / colField', () => {
    const items = [
      item('thought.a', 'thought', { goalPath: '武装大脑/了解自我' }),
      item('task.b', 'task', { status: 'open', goalPath: '工作能力/设计' }),
    ];
    const block = exportViewToMarkdown({
      items,
      viewInstance: view('BlockView', { groupFields: ['recordType', 'goalPath'] }),
    });
    expect(block).toContain('## 任务');
    expect(block).toContain('## 思考');
    expect(block).toContain('### 工作能力/设计');

    const table = exportViewToMarkdown({
      items,
      viewInstance: view('TableView', { viewConfig: { rowField: 'recordType', colField: 'goalPath' } }),
    });
    expect(table).toContain('## 任务');
    expect(table).toContain('### 工作能力/设计');
  });

  it('ExcelView 生成 Markdown 表格，且 Task 自动补充实际/预计时长列', () => {
    const task = item('task.table', 'task', { status: 'done', goalPath: '工作能力/设计', expectedDurationMinutes: 30 });
    const session = item('session.table', 'task-session', {
      taskId: task.id,
      sessionStartedAt: '2026-09-12T09:00:00',
      sessionEndedAt: '2026-09-12T09:45:00',
      sessionDurationMinutes: 45,
      sessionResult: 'task-completed',
      sessionSource: 'timer',
    });
    const markdown = exportViewToMarkdown({
      items: [task],
      relatedRecords: [task, session],
      viewInstance: view('ExcelView', { fields: ['primaryText', 'goalPath', 'status'] }),
    });
    expect(markdown).toContain('| 主显示值 | 目标 | 状态 | 实际时长 | 预计时长 |');
    expect(markdown).toContain('45 分钟');
    expect(markdown).toContain('30 分钟');
  });

  it('StatisticsView 默认导出聚合结果，而不是底层记录 ID dump', () => {
    const markdown = exportViewToMarkdown({
      items: [
        item('task.a', 'task', { status: 'done', goalPath: '工作能力/设计' }),
        item('task.b', 'task', { status: 'done', goalPath: '工作能力/投标' }),
        item('task.c', 'task', { status: 'open', goalPath: '照顾好自己/睡眠' }),
      ],
      viewInstance: view('StatisticsView', { viewConfig: { metric: 'doneTaskCount', topN: 10 } }),
    });
    expect(markdown).toContain('指标：已完成任务');
    expect(markdown).toContain('总计：2');
    expect(markdown).toContain('工作能力：2');
    expect(markdown).not.toContain('task.a');
  });
});
