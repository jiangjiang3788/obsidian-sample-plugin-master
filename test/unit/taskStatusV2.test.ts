/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F050/regression
 * @covers F050/unit
 */
import {
  canTransitionTaskStatus,
  getTaskStatus,
  getTaskStatusPresentation,
  isTaskOpen,
  nextTaskStatus,
} from '@core/records/public';
import type { RecordViewItem } from '@core/types/public';

function task(status: string, seriesId?: string): RecordViewItem {
  return {
    id: 'task.01J00000000000000000000000',
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
  } as RecordViewItem;
}

describe('Task status v2', () => {
  it('owns one emoji vocabulary for lifecycle presentation', () => {
    expect(getTaskStatusPresentation('open')).toMatchObject({ label: '未完成', emoji: '⏳' });
    expect(getTaskStatusPresentation('done')).toMatchObject({ label: '已完成', emoji: '✅' });
    expect(getTaskStatusPresentation('cancelled')).toMatchObject({ label: '已取消', emoji: '❌' });
    expect(getTaskStatusPresentation('skipped')).toMatchObject({ label: '已跳过', emoji: '⏭️' });
  });

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
