import { RecordIndex } from '@/core/records/RecordIndex';
import type { Item } from '@/core/types/schema';

function item(id: string, coreBlock: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    coreBlock,
    title: id,
    content: id,
    tags: [],
    goalPaths: [],
    categoryKey: coreBlock,
    created: 1,
    modified: 1,
    extra: {},
    source: { path: `${id}.md`, startLine: 1, endLine: 3, modified: 1 },
    ...extra,
  } as Item;
}

describe('RecordIndex v2 integrity stabilization', () => {
  it('flags a Session that claims a Series while its Task does not', () => {
    const task = item('task.01J00000000000000000000000', 'task', { status: 'done' });
    const series = item('taskseries.01J00000000000000000000000', 'task-series', { status: 'stopped', recurrenceInfo: { unit: 'week', interval: 1, anchor: 'scheduled' } });
    const session = item('tasksession.01J00000000000000000000000', 'task-session', { taskId: task.id, seriesId: series.id });
    const index = new RecordIndex();
    index.rebuild(new Map([['all.md', [task, series, session]]]));
    expect(index.getIssues().some(issue => issue.code === 'task_session_reference_orphan' && issue.recordId === session.id)).toBe(true);
  });

  it('flags missing Energy Snapshot references from Session history', () => {
    const task = item('task.01J00000000000000000000001', 'task', { status: 'done' });
    const session = item('tasksession.01J00000000000000000000001', 'task-session', {
      taskId: task.id,
      endEnergyRecordId: 'energy.01J00000000000000000000000',
    });
    const index = new RecordIndex();
    index.rebuild(new Map([['all.md', [task, session]]]));
    expect(index.getIssues().some(issue => issue.message.includes('Energy Record'))).toBe(true);
  });
});
