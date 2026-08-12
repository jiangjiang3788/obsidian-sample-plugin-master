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
    goalPath: '#测试目标',
    ...overrides,
  } as RecordViewItem;
}

function recurring(id: string, title: string, unit: 'day' | 'week' | 'month' | 'quarter' | 'year', goalPath?: string): RecordViewItem {
  return task(id, title, {
    goalPath: goalPath || '#测试目标',
    seriesId: `taskseries.${id}`,
    recurrenceInfo: { unit, interval: 1, anchor: 'scheduled' },
  });
}

describe('buildEnergyTaskListModel', () => {
  it('groups by goal first, then renders six fixed cadence rows from structured recurrence', () => {
    const today = '2026-08-10';
    const items = [
      task('routine', '普通任务'),
      recurring('day', '天任务', 'day'),
      recurring('week', '周任务', 'week'),
      recurring('month', '月任务', 'month'),
      recurring('quarter', '季任务', 'quarter'),
      recurring('year', '年任务', 'year'),
    ];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today });
    expect(model.goals).toHaveLength(1);
    expect(model.goals[0].label).toBe('#测试目标');
    expect(model.goals[0].rows.map((row) => [row.key, row.tasks.map((entry) => entry.itemId)])).toEqual([
      ['routine', ['routine']],
      ['day', ['day']],
      ['week', ['week']],
      ['month', ['month']],
      ['quarter', ['quarter']],
      ['year', ['year']],
    ]);
  });



  it('keeps different goals separate while preserving the same cadence rows', () => {
    const items = [
      task('a', 'A任务', { goalPath: '#工作能力' }),
      recurring('b', 'B任务', 'week', '#爱好能力'),
    ];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10' });
    expect(model.goals.map((goal) => goal.label).sort()).toEqual(['#工作能力', '#爱好能力'].sort());
    expect(model.goals.every((goal) => goal.rows.length === 6)).toBe(true);
  });

  it('keeps real Tasks only and never creates virtual recovery actions', () => {
    const items = [task('real', '真实任务')];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10' });
    expect(model.goals.flatMap((goal) => goal.rows.flatMap((row) => row.tasks)).map((entry) => entry.itemId)).toEqual(['real']);
  });
});
