import { buildEnergyTaskListModel, classifyEnergyTaskCadence } from '@/features/settings/views/models/energyTaskListModel';
import type { Item } from '@core/types/public';

function task(id: string, title: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    title,
    content: `- [ ] ${title}`,
    type: 'task',
    tags: [],
    categoryKey: '任务',
    recurrence: 'none',
    created: 0,
    modified: 0,
    extra: {},
    goalPath: '#测试目标',
    ...extra,
  } as Item;
}

describe('buildEnergyTaskListModel', () => {
  it('groups by goal first, then renders six fixed cadence rows', () => {
    const today = '2026-08-10';
    const items = [
      task('routine', '普通任务'),
      task('day', '天任务', { recurrence: 'every day' }),
      task('week', '周任务', { recurrence: 'every week' }),
      task('month', '月任务', { recurrence: 'every month' }),
      task('quarter', '季任务', { recurrence: 'every quarter' }),
      task('year', '年任务', { recurrence: 'every year' }),
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

  it('does not reinterpret scheduled ordinary tasks as day/week task types', () => {
    expect(classifyEnergyTaskCadence(task('today', '今天排期', { scheduledDate: '2026-08-10' }))).toBe('routine');
    expect(classifyEnergyTaskCadence(task('week', '本周排期', { dueDate: '2026-08-12' }))).toBe('routine');
  });

  it('treats every 3 months as a quarter cadence', () => {
    expect(classifyEnergyTaskCadence(task('quarter', '季度整理', { recurrence: 'every 3 months' }))).toBe('quarter');
  });

  it('keeps different goals separate while preserving the same cadence rows', () => {
    const items = [
      task('a', 'A任务', { goalPath: '#工作能力' }),
      task('b', 'B任务', { goalPath: '#爱好能力', recurrence: 'every week' }),
    ];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10' });
    expect(model.goals.map((goal) => goal.label).sort()).toEqual(['#工作能力', '#爱好能力'].sort());
    expect(model.goals.every((goal) => goal.rows.length === 6)).toBe(true);
  });

  it('keeps real tasks only and never creates virtual recovery actions', () => {
    const items = [task('real', '真实任务')];
    const model = buildEnergyTaskListModel({ items, historyItems: items, timers: [], management: null, today: '2026-08-10' });
    expect(model.goals.flatMap((goal) => goal.rows.flatMap((row) => row.tasks)).map((entry) => entry.itemId)).toEqual(['real']);
  });
});
