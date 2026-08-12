import { buildEnergyTaskListModel } from '@/features/views/models/energyTaskListModel';
import type { RecordViewItem } from '@core/types/public';

function task(id: string, title: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id,
    title,
    content: title,
    tags: [],
    categoryKey: '',
    created: 0,
    modified: 0,
    extra: {},
    coreBlock: 'task',
    status: 'open',
    goalId: 'goal.test',
    goalPath: '测试目标',
    ...overrides,
  } as RecordViewItem;
}

function recurring(id: string, title: string, unit: 'day' | 'week' | 'month' | 'quarter' | 'year', goalPath?: string): RecordViewItem {
  return task(id, title, {
    goalId: goalPath === '爱好能力' ? 'goal.hobby' : (goalPath === '工作能力' ? 'goal.work' : 'goal.test'),
    goalPath: goalPath || '测试目标',
    seriesId: `taskseries.${id}`,
    recurrenceInfo: { unit, interval: 1, anchor: 'scheduled' },
  });
}

function dayRange(day = '2026-08-10'): [Date, Date] {
  return [new Date(`${day}T00:00:00`), new Date(`${day}T23:59:59.999`)];
}

describe('buildEnergyTaskListModel', () => {
  it('groups by goal first, then renders only non-empty cadence rows from structured recurrence', () => {
    const today = '2026-08-10';
    const items = [
      task('routine', '普通任务'),
      recurring('day', '天任务', 'day'),
      recurring('week', '周任务', 'week'),
      recurring('month', '月任务', 'month'),
      recurring('quarter', '季任务', 'quarter'),
      recurring('year', '年任务', 'year'),
    ];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today, dateRange: dayRange(today) });
    expect(model.goals).toHaveLength(1);
    expect(model.goals[0].label).toBe('测试目标');
    expect(model.goals[0].rows.map((row) => [row.key, row.tasks.map((entry) => entry.itemId)])).toEqual([
      ['routine', ['routine']],
      ['day', ['day']],
      ['week', ['week']],
      ['month', ['month']],
      ['quarter', ['quarter']],
      ['year', ['year']],
    ]);
  });

  it('keeps different goals separate while only exposing cadence rows that really contain tasks', () => {
    const items = [
      task('a', 'A任务', { goalId: 'goal.work', goalPath: '工作能力' }),
      recurring('b', 'B任务', 'week', '爱好能力'),
    ];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10', dateRange: dayRange() });
    expect(model.goals.map((goal) => goal.label).sort()).toEqual(['工作能力', '爱好能力'].sort());
    expect(model.goals.find((goal) => goal.label === '工作能力')?.rows.map((row) => row.key)).toEqual(['routine']);
    expect(model.goals.find((goal) => goal.label === '爱好能力')?.rows.map((row) => row.key)).toEqual(['week']);
  });

  it('keeps real Tasks only and never creates virtual recovery actions', () => {
    const items = [task('real', '真实任务')];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10', dateRange: dayRange() });
    expect(model.goals.flatMap((goal) => goal.rows.flatMap((row) => row.tasks)).map((entry) => entry.itemId)).toEqual(['real']);
  });

  it('counts completed task occurrences only inside the current view range and only for the same series', () => {
    const open = task('open', '吃钙片', {
      seriesId: 'taskseries.current',
      recurrenceInfo: { unit: 'day', interval: 1, anchor: 'start' },
    });
    const sameSeriesToday = task('done-today', '吃钙片', {
      status: 'done',
      seriesId: 'taskseries.current',
      completedAt: '2026-08-10T08:30:00',
    });
    const sameSeriesYesterday = task('done-yesterday', '吃钙片', {
      status: 'done',
      seriesId: 'taskseries.current',
      completedAt: '2026-08-09T08:30:00',
    });
    const oldSeriesToday = task('old-series', '吃钙片', {
      status: 'done',
      seriesId: 'taskseries.old',
      completedAt: '2026-08-10T09:00:00',
    });
    const sessionToday = {
      ...task('session', '执行记录'),
      coreBlock: 'task-session',
      taskId: 'done-today',
      sessionStartedAt: '2026-08-10T08:00:00',
      sessionEndedAt: '2026-08-10T08:20:00',
    } as RecordViewItem;

    const model = buildEnergyTaskListModel({
      items: [open],
      historyItems: [open, sameSeriesToday, sameSeriesYesterday, oldSeriesToday, sessionToday],
      timers: [],
      management: null,
      today: '2026-08-10',
      dateRange: dayRange('2026-08-10'),
    });
    const rendered = model.goals.flatMap((goal) => goal.rows.flatMap((row) => row.tasks))[0];
    expect(rendered.count).toBe(1);
    expect(rendered.records.map((record) => record.id)).toEqual(['done-today']);
  });
});
