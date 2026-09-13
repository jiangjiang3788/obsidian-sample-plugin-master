/**
 * @covers F094/unit
 * @covers F094/regression
 */
import type { RecordViewItem } from '@core/types/public';
import {
  buildWhiteboardGoalScope,
  buildWhiteboardRecordSourceSpec,
  collectWhiteboardGoalTree,
  collectWhiteboardRecordTypeOptions,
  queryWhiteboardRecordSource,
  type WhiteboardRecordSourceState,
} from '@/features/whiteboard/WhiteboardRecordSourceQuery';

function record(id: string, recordType: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    recordType,
    title: id,
    content: `${id} 内容`,
    tags: [],
    date: '2026-08-10',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as RecordViewItem;
}

const EMPTY_STATE: WhiteboardRecordSourceState = { keyword: '', recordTypes: [], goalPaths: [], time: null };

function findGoalNode(nodes: ReturnType<typeof collectWhiteboardGoalTree>, path: string): ReturnType<typeof collectWhiteboardGoalTree>[number] | undefined {
  for (const node of nodes) {
    if (node.value === path) return node;
    const child = findGoalNode(node.children, path);
    if (child) return child;
  }
  return undefined;
}

describe('白板 Record Source 查询模型 1.1.1', () => {
  const records = [
    record('task-backlog', 'task', { status: 'open', goalPath: '照顾好自己/睡眠', date: '2026-03-01', scheduledAt: '2026-08-10T09:00:00', dueAt: '2026-08-11T18:00:00', completedAt: '2026-08-12T10:00:00', content: '睡眠 手机计划' }),
    record('thought-sleep', 'thought', { goalPath: '照顾好自己/睡眠', date: '2026-08-10', content: '半夜刷手机之后睡眠变差' }),
    record('evidence-sleep-deep', 'event', { goalPath: '照顾好自己/睡眠/刺激', date: '2026-08-11', content: '手机刺激证据' }),
    record('evidence-prefix-collision', 'event', { goalPath: '照顾好自己/睡眠质量', date: '2026-08-11', content: '不属于睡眠子树' }),
    record('session-actual', 'task-session', { goalPath: '照顾好自己/睡眠', date: '2026-08-13', sessionStartedAt: '2026-08-13T23:10:00', sessionEndedAt: '2026-08-13T23:40:00', sessionDurationMinutes: 30, taskId: 'task-backlog', content: '实际睡眠工作块' }),
  ];

  test('空状态返回用户 Record pool，并且 internal task-session 不进入类型 facet', () => {
    const result = queryWhiteboardRecordSource(records, EMPTY_STATE);
    expect(result.totalCount).toBe(records.length - 1);
    const options = collectWhiteboardRecordTypeOptions(records);
    expect(options.find(option => option.value === 'task-session')).toBeUndefined();
    expect(options.map(option => option.value)).toEqual(expect.arrayContaining(['task', 'thought', 'event']));
  });

  test('Goal facet 构造成层级树；父节点保存真实子树精确 paths，不误命中前缀碰撞', () => {
    const tree = collectWhiteboardGoalTree(records);
    const sleep = findGoalNode(tree, '照顾好自己/睡眠');
    expect(findGoalNode(tree, '照顾好自己')).toBeTruthy();
    expect(sleep?.label).toBe('睡眠');
    expect(sleep?.selectableGoalPaths).toEqual([
      '照顾好自己/睡眠',
      '照顾好自己/睡眠/刺激',
    ]);
    expect(buildWhiteboardGoalScope(records, '照顾好自己/睡眠')).toEqual([
      '照顾好自己/睡眠',
      '照顾好自己/睡眠/刺激',
    ]);
  });

  test('keyword + 多类型 OR + 多 Goal path OR 之间按 AND 组合，并由一次 RecordQuery 执行', () => {
    const state: WhiteboardRecordSourceState = {
      keyword: '手机',
      recordTypes: ['thought', 'event'],
      goalPaths: ['照顾好自己/睡眠', '照顾好自己/睡眠/刺激'],
      time: null,
    };
    const result = queryWhiteboardRecordSource(records, state);
    expect(result.matchedItems.map(item => item.id)).toEqual(['thought-sleep', 'evidence-sleep-deep']);
    const spec = buildWhiteboardRecordSourceSpec(records, state);
    expect(spec.filterGroups).toEqual([
      [{ field: 'recordType', op: 'in', value: ['thought', 'event'] }],
      [{ field: 'goalPath', op: 'in', value: ['照顾好自己/睡眠', '照顾好自己/睡眠/刺激'] }],
    ]);
  });

  test('默认时间筛选使用 strict，范围外 open Task 不得像 Dashboard standard 那样保留', () => {
    const result = queryWhiteboardRecordSource(records, {
      ...EMPTY_STATE,
      time: { role: 'default', startDate: '2026-08-10', endDate: '2026-08-11' },
    });
    expect(result.matchedItems.map(item => item.id)).not.toContain('task-backlog');
    expect(result.matchedItems.map(item => item.id)).toEqual(expect.arrayContaining(['thought-sleep', 'evidence-sleep-deep', 'evidence-prefix-collision']));
  });

  test('scheduled / due / completed / actual 四种 dateRole 使用各自 canonical 时间事实', () => {
    const idsFor = (role: 'task-scheduled' | 'task-due' | 'task-completed' | 'task-actual', date: string) => queryWhiteboardRecordSource(records, {
      ...EMPTY_STATE,
      time: { role, startDate: date, endDate: date },
    }).matchedItems.map(item => item.id);

    expect(idsFor('task-scheduled', '2026-08-10')).toEqual(['task-backlog']);
    expect(idsFor('task-due', '2026-08-11')).toEqual(['task-backlog']);
    expect(idsFor('task-completed', '2026-08-12')).toEqual(['task-backlog']);
    expect(idsFor('task-actual', '2026-08-13')).toEqual(['task-backlog']);
  });

  test('无效时间不生成 date constraint，且返回本地校验错误', () => {
    const state: WhiteboardRecordSourceState = {
      ...EMPTY_STATE,
      keyword: '手机',
      time: { role: 'default', startDate: '2026-09-10', endDate: '2026-09-01' },
    };
    expect(buildWhiteboardRecordSourceSpec(records, state).date).toBeUndefined();
    const result = queryWhiteboardRecordSource(records, state);
    expect(result.dateError).toContain('开始日期');
    expect(result.matchedItems.map(item => item.id)).toEqual(expect.arrayContaining(['task-backlog', 'thought-sleep', 'evidence-sleep-deep']));
  });

  test('已在当前白板的 Record 从候选结果与匹配总数中排除，右侧成为唯一“已加入”视觉真源', () => {
    const result = queryWhiteboardRecordSource(records, EMPTY_STATE, new Set(['thought-sleep', 'session-actual']));
    expect(result.matchedItems.map(item => item.id)).not.toEqual(expect.arrayContaining(['thought-sleep', 'session-actual']));
    expect(result.totalCount).toBe(records.length - 2);
  });

  test('80 条 cap 只限制渲染集合，不篡改真实匹配总数', () => {
    const many = Array.from({ length: 83 }, (_, index) => record(`thought-${index}`, 'thought', { content: '统一命中' }));
    const result = queryWhiteboardRecordSource(many, { ...EMPTY_STATE, keyword: '统一命中' });
    expect(result.totalCount).toBe(83);
    expect(result.visibleCount).toBe(80);
    expect(result.visibleItems).toHaveLength(80);
  });
});
