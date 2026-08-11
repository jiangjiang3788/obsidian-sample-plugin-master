import {
  canTransitionTaskStatus,
  getTaskStatus,
  isTaskOpen,
  nextTaskStatus,
} from '@core/records/task';
import type { Item } from '@core/types/public';

function task(status: string, seriesId?: string): Item {
  return {
    id: 'task.01J00000000000000000000000',
    schemaVersion: 2,
    coreBlock: 'task',
    status,
    seriesId,
    title: 'Task',
    content: 'Task',
    tags: [],
    categoryKey: 'ignored',
    created: 0,
    modified: 0,
    extra: {},
  } as Item;
}

describe('Task status v2', () => {
  it('uses only explicit Task status', () => {
    expect(getTaskStatus(task('open'))).toBe('open');
    expect(isTaskOpen(task('open'))).toBe(true);
    expect(getTaskStatus(task('todo'))).toBeNull();
  });

  it('allows skip only for recurring instances and cancel only for one-time tasks', () => {
    expect(canTransitionTaskStatus('open', 'skip', { recurring: true })).toBe(true);
    expect(canTransitionTaskStatus('open', 'skip', { recurring: false })).toBe(false);
    expect(canTransitionTaskStatus('open', 'cancel', { recurring: false })).toBe(true);
    expect(canTransitionTaskStatus('open', 'cancel', { recurring: true })).toBe(false);
  });

  it('requires explicit reopen from a terminal status', () => {
    expect(canTransitionTaskStatus('done', 'complete', { recurring: false })).toBe(false);
    expect(canTransitionTaskStatus('done', 'reopen', { recurring: false })).toBe(true);
    expect(nextTaskStatus('reopen')).toBe('open');
  });
});
