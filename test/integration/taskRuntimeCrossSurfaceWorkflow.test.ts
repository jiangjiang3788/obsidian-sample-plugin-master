/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F045/integration
 * @covers F056/integration
 * @covers F126/regression
 */
import { completeFromView } from '@/app/actions/recordTaskActions';
import { TaskRuntimeUseCase } from '@/app/usecases/taskRuntime.usecase';
import type { RecordInputUseCase } from '@/app/usecases/recordInput.usecase';
import type { TimerUseCase } from '@/app/usecases/timer.usecase';
import type { UseCases } from '@/app/usecases';
import type { DataStore } from '@core/services/public';
import type { TimerState } from '@core/types/public';

const TASK_ID = 'task.01J00000000000000000000126';

describe('跨 View 的 Task runtime 完成工作流', () => {
  afterEach(() => jest.restoreAllMocks());

  it('正在计时时从普通 View 点击完成，会读取 canonical Timer context、保存最后 Session 并清理 runtime', async () => {
    let timers: TimerState[] = [{
      id: 'timer.cross-surface',
      taskId: TASK_ID,
      startedAt: new Date('2026-08-26T14:00:00').getTime(),
      startTime: new Date('2026-08-26T14:35:00').getTime(),
      elapsedSeconds: 1500,
      status: 'running',
      source: 'timer',
    }];
    const removeTimer = jest.fn(async (timerId: string) => {
      timers = timers.filter((timer) => timer.id !== timerId);
    });
    const timerUseCase = {
      getTimers: () => timers,
      removeTimer,
    } as unknown as TimerUseCase;
    const dataStore = {
      getRecordById: (id: string) => id === TASK_ID
        ? { id, coreBlock: 'task', status: 'open', content: '跨 View 完成' }
        : null,
    } as unknown as DataStore;
    const submitCompleteRecord = jest.fn(async () => ({
      status: 'success' as const,
      operation: 'complete' as const,
      refresh: { scanPaths: [], notify: true },
      feedback: { notice: '任务已完成，本次工作已保存为 Session。' },
    }));
    const recordInput = { submitCompleteRecord } as unknown as RecordInputUseCase;
    const taskRuntime = new TaskRuntimeUseCase(dataStore, timerUseCase, recordInput);
    const notice = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-26T14:55:00').getTime());

    const ok = await completeFromView({
      uiPort: { notice } as never,
      useCases: { taskRuntime } as unknown as UseCases,
      itemId: TASK_ID,
      source: 'layout_renderer',
    });

    expect(ok).toBe(true);
    expect(submitCompleteRecord).toHaveBeenCalledWith({
      itemId: TASK_ID,
      source: 'timer',
      session: expect.objectContaining({
        startedAt: new Date('2026-08-26T14:35:00').toISOString(),
        endedAt: new Date('2026-08-26T14:55:00').toISOString(),
        durationMinutes: 20,
        result: 'task-completed',
      }),
    });
    expect(removeTimer).toHaveBeenCalledWith('timer.cross-surface');
    expect(timers).toEqual([]);
  });
});
