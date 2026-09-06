/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/unit
 * @covers F126/regression
 */
import { buildTaskSessionFields, getTaskSessionResultPresentation } from '@/core/records/task/taskSession';

describe('TaskSession Timeline presentation V4', () => {
  it('presents historical execution result independently from current Task lifecycle', () => {
    expect(getTaskSessionResultPresentation('task-completed')).toMatchObject({
      emoji: '✅',
      label: '本次执行已完成任务',
      className: 'done',
    });
    expect(getTaskSessionResultPresentation('work-block-ended')).toMatchObject({
      emoji: '▶️',
      label: '工作块已结束',
      className: 'open',
    });
  });

  it('rejects zero-minute actual Sessions at the TaskSession domain boundary', () => {
    expect(() => buildTaskSessionFields(
      { id: 'task.01KZZQ6G798KJN54XBGKJVH7ZZ' },
      {
        startedAt: '2026-08-26T10:00:00.000Z',
        endedAt: '2026-08-26T10:00:00.000Z',
        durationMinutes: 0,
        result: 'work-block-ended',
        source: 'timeline',
      },
    )).toThrow('task_session_duration_invalid');
  });

});
