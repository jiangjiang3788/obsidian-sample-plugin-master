import {
  buildTaskExecutionCountLabel,
  buildTaskExecutionTaskMap,
  getTaskExecutionChipToneClass,
  getTaskExecutionRecordLabel,
  getTaskExecutionSelectedTask,
} from '@/shared/ui/views/TaskExecutionViewModel';

const item = { id: 'r1', type: 'block', title: '记录', fields: {} } as any;

const task = {
  key: 'task-a',
  aggregateKey: 'a',
  itemId: 'item-a',
  title: '复盘',
  count: 2,
  recurrenceLabel: 'every week',
  records: [{ id: 'r1', timeLabel: '09:00', item }],
};

const model = {
  sections: [{ key: 's1', title: '本周', groups: [{ key: 'g1', title: '工作', tasks: [task] }] }],
};

describe('TaskExecutionViewModel', () => {
  it('maps recurrence label to chip tone', () => {
    expect(getTaskExecutionChipToneClass('')).toBe('task-execution-chip--tone-0');
    expect(getTaskExecutionChipToneClass('every day')).toBe('task-execution-chip--tone-1');
    expect(getTaskExecutionChipToneClass('every week')).toBe('task-execution-chip--tone-2');
    expect(getTaskExecutionChipToneClass('every month')).toBe('task-execution-chip--tone-3');
    expect(getTaskExecutionChipToneClass('every year')).toBe('task-execution-chip--tone-4');
  });

  it('builds task map and selected task', () => {
    const map = buildTaskExecutionTaskMap(model as any);
    expect(map.get('task-a')?.title).toBe('复盘');
    expect(getTaskExecutionSelectedTask({ menu: { x: 1, y: 2, taskKey: 'task-a' }, taskMap: map })?.itemId).toBe('item-a');
    expect(getTaskExecutionSelectedTask({ menu: null, taskMap: map })).toBeNull();
  });

  it('builds labels for context menu', () => {
    expect(buildTaskExecutionCountLabel('周', 3)).toBe('周内完成 3 次');
    expect(getTaskExecutionRecordLabel({ id: 'r1', timeLabel: '09:00', item } as any)).toBe('09:00');
    expect(getTaskExecutionRecordLabel({ id: 'r2', doneDate: '2026-06-01', timeLabel: '', item } as any)).toBe('2026-06-01');
    expect(getTaskExecutionRecordLabel({ id: 'r3', timeLabel: '', item } as any)).toBe('查看记录');
  });
});
