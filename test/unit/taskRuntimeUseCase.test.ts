/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F045/unit
 * @covers F056/unit
 * @covers F126/regression
 */
import { TaskRuntimeUseCase } from '@/app/usecases/taskRuntime.usecase';
import type { RecordInputUseCase } from '@/app/usecases/recordInput.usecase';
import type { TimerUseCase } from '@/app/usecases/timer.usecase';
import type { DataStore } from '@core/services/public';
import type { TimerState } from '@core/types/public';

const TASK_ID = 'task.01J00000000000000000000999';

function harness(timerState?: TimerState) {
  let timers = timerState ? [timerState] : [];
  const removeTimer = jest.fn(async (timerId: string) => {
    timers = timers.filter((timer) => timer.id !== timerId);
  });
  const timer = {
    getTimers: () => timers,
    removeTimer,
  } as unknown as TimerUseCase;
  const submitCompleteRecord = jest.fn(async () => ({
    status: 'success' as const,
    operation: 'complete' as const,
    refresh: { scanPaths: [], notify: true },
    feedback: { notice: '任务已完成。' },
  }));
  const submitTaskLifecycle = jest.fn(async () => ({
    status: 'success' as const,
    operation: 'update' as const,
    refresh: { scanPaths: [], notify: true },
    feedback: { notice: '任务状态已更新。' },
  }));
  const recordInput = { submitCompleteRecord, submitTaskLifecycle } as unknown as RecordInputUseCase;
  const dataStore = {
    getRecordById: (id: string) => id === TASK_ID
      ? { id, coreBlock: 'task', status: 'open', title: '上下文任务', content: '上下文任务' }
      : null,
  } as unknown as DataStore;
  return {
    runtime: new TaskRuntimeUseCase(dataStore, timer, recordInput),
    submitCompleteRecord,
    submitTaskLifecycle,
    removeTimer,
    timers: () => timers,
  };
}

describe('TaskRuntimeUseCase 完成任务唯一上下文边界', () => {
  afterEach(() => jest.restoreAllMocks());

  it('View/QuickInput 完成正在计时的 Task 时自动读取 Timer context 并保存最后 Session', async () => {
    const timer: TimerState = {
      id: 'timer.context',
      taskId: TASK_ID,
      startedAt: new Date('2026-08-26T09:00:00').getTime(),
      startTime: new Date('2026-08-26T09:30:00').getTime(),
      elapsedSeconds: 1200,
      status: 'running',
      source: 'timer',
    };
    const h = harness(timer);
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-26T09:50:00').getTime());

    const result = await h.runtime.completeTask({ taskId: TASK_ID, source: 'quickinput' });

    expect(result.status).toBe('success');
    expect(h.submitCompleteRecord).toHaveBeenCalledWith({
      itemId: TASK_ID,
      source: 'timer',
      session: expect.objectContaining({
        startedAt: new Date('2026-08-26T09:30:00').toISOString(),
        endedAt: new Date('2026-08-26T09:50:00').toISOString(),
        durationMinutes: 20,
        result: 'task-completed',
        source: 'timer',
      }),
    });
    expect(h.removeTimer).toHaveBeenCalledWith('timer.context');
    expect(h.timers()).toHaveLength(0);
  });

  it('暂停中的 Timer 已经持久化工作段，完成时不伪造零时长 Session，但会清掉 Timer runtime', async () => {
    const h = harness({
      id: 'timer.paused',
      taskId: TASK_ID,
      startedAt: 1,
      startTime: 2,
      elapsedSeconds: 900,
      status: 'paused',
      source: 'timer',
    });

    const result = await h.runtime.completeTask({ taskId: TASK_ID, source: 'layout_renderer' });

    expect(result.status).toBe('success');
    expect(h.submitCompleteRecord).toHaveBeenCalledWith({
      itemId: TASK_ID,
      session: undefined,
      source: 'timer',
    });
    expect(h.removeTimer).toHaveBeenCalledWith('timer.paused');
  });

  it('没有 Timer 时只改变 Task 生命周期，不凭 View 时间伪造实际 Session', async () => {
    const h = harness();
    await h.runtime.completeTask({ taskId: TASK_ID, source: 'layout_renderer' });
    expect(h.submitCompleteRecord).toHaveBeenCalledWith({
      itemId: TASK_ID,
      session: undefined,
      source: 'layout_renderer',
    });
    expect(h.removeTimer).not.toHaveBeenCalled();
  });

  it('Task context 不存在时在应用边界直接返回明确错误', async () => {
    const h = harness();
    const result = await h.runtime.completeTask({ taskId: 'task.missing', source: 'quickinput' });
    expect(result.status).toBe('validation_error');
    expect(result.errors?.[0]?.code).toBe('task_runtime_context_missing');
    expect(h.submitCompleteRecord).not.toHaveBeenCalled();
  });

  it('Timer 面板携带 expectedTimerId 时会校验上下文没有在点击后发生变化', async () => {
    const h = harness({
      id: 'timer.current',
      taskId: TASK_ID,
      startedAt: 1,
      startTime: 2,
      elapsedSeconds: 0,
      status: 'paused',
      source: 'timer',
    });

    const result = await h.runtime.completeTask({
      taskId: TASK_ID,
      expectedTimerId: 'timer.stale',
      source: 'timer',
    });

    expect(result.status).toBe('validation_error');
    expect(result.errors?.[0]?.code).toBe('task_runtime_timer_context_changed');
    expect(h.submitCompleteRecord).not.toHaveBeenCalled();
    expect(h.removeTimer).not.toHaveBeenCalled();
  });


  it('从任意 View 取消正在计时的 Task 时先保存当前工作段，再取消任务并清理 Timer', async () => {
    const h = harness({
      id: 'timer.cancel-running',
      taskId: TASK_ID,
      startedAt: new Date('2026-08-26T10:00:00').getTime(),
      startTime: new Date('2026-08-26T10:15:00').getTime(),
      elapsedSeconds: 900,
      status: 'running',
      source: 'timer',
    });
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-26T10:35:00').getTime());

    const result = await h.runtime.runLifecycle({ taskId: TASK_ID, command: 'cancel', source: 'quickinput' });

    expect(result.status).toBe('success');
    expect(h.submitTaskLifecycle).toHaveBeenCalledWith(
      TASK_ID,
      'cancel',
      expect.objectContaining({
        startedAt: new Date('2026-08-26T10:15:00').toISOString(),
        endedAt: new Date('2026-08-26T10:35:00').toISOString(),
        durationMinutes: 20,
        result: 'work-block-ended',
      }),
    );
    expect(h.removeTimer).toHaveBeenCalledWith('timer.cancel-running');
  });

  it('暂停中的周期 Task 跳过本次时不重复造 Session，但会清理 Timer runtime', async () => {
    const h = harness({
      id: 'timer.skip-paused',
      taskId: TASK_ID,
      startedAt: 1,
      startTime: 2,
      elapsedSeconds: 1200,
      status: 'paused',
      source: 'timer',
    });

    const result = await h.runtime.runLifecycle({ taskId: TASK_ID, command: 'skip', source: 'quickinput' });

    expect(result.status).toBe('success');
    expect(h.submitTaskLifecycle).toHaveBeenCalledWith(TASK_ID, 'skip', undefined);
    expect(h.removeTimer).toHaveBeenCalledWith('timer.skip-paused');
  });

});
