/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/unit
 * @covers F126/regression
 */
import { TimerService } from '@/features/timer/TimerService';
import type { TimerState } from '@core/types/public';

describe('Timer 连续执行段 V9', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('暂停会持久化当前连续 Session，恢复后开始新的 Session，不把暂停空档算进实际时间', async () => {
    let timers: TimerState[] = [{
      id: 'timer.1',
      taskId: 'task.01J00000000000000000000000',
      startedAt: new Date('2026-08-26T09:00:00').getTime(),
      startTime: new Date('2026-08-26T09:00:00').getTime(),
      elapsedSeconds: 0,
      status: 'running',
      source: 'timer',
    }];
    const submitTaskSession = jest.fn(async () => ({ status: 'success' as const }));
    const updateTimer = jest.fn(async (next: TimerState) => {
      timers = timers.map((timer) => timer.id === next.id ? next : timer);
    });
    const useCases = {
      timer: {
        getTimers: () => timers,
        updateTimer,
        addTimer: jest.fn(),
        removeTimer: jest.fn(),
      },
      recordInput: {
        submitTaskSession,
        submitCompleteRecord: jest.fn(),
      },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: () => ({ id: timers[0]?.taskId, coreBlock: 'task', status: 'open' }),
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];
    const service = new TimerService(useCases, dataStore, ui);

    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(new Date('2026-08-26T09:20:00').getTime())
      .mockReturnValueOnce(new Date('2026-08-26T09:50:00').getTime())
      .mockReturnValueOnce(new Date('2026-08-26T10:10:00').getTime());

    await service.pause('timer.1');
    expect(submitTaskSession).toHaveBeenNthCalledWith(1, expect.objectContaining({
      itemId: timers[0].taskId,
      session: expect.objectContaining({
        startedAt: new Date('2026-08-26T09:00:00').toISOString(),
        endedAt: new Date('2026-08-26T09:20:00').toISOString(),
        durationMinutes: 20,
        result: 'work-block-ended',
      }),
    }));
    expect(timers[0]).toMatchObject({ status: 'paused', elapsedSeconds: 1200 });

    await service.resume('timer.1');
    expect(timers[0]).toMatchObject({
      status: 'running',
      startTime: new Date('2026-08-26T09:50:00').getTime(),
      elapsedSeconds: 1200,
    });

    await service.pause('timer.1');
    expect(submitTaskSession).toHaveBeenNthCalledWith(2, expect.objectContaining({
      session: expect.objectContaining({
        startedAt: new Date('2026-08-26T09:50:00').toISOString(),
        endedAt: new Date('2026-08-26T10:10:00').toISOString(),
        durationMinutes: 20,
      }),
    }));
    expect(timers[0]).toMatchObject({ status: 'paused', elapsedSeconds: 2400 });
  });

  it('已暂停的 Timer 完成任务时不伪造零时长 Session', async () => {
    const timer: TimerState = {
      id: 'timer.2', taskId: 'task.01J00000000000000000000001',
      startedAt: 1, startTime: 2, elapsedSeconds: 600, status: 'paused', source: 'timer',
    };
    const completeTask = jest.fn(async () => ({ status: 'success' as const, feedback: { notice: '任务已完成。' } }));
    const useCases = {
      timer: { getTimers: () => [timer], removeTimer: jest.fn(), updateTimer: jest.fn(), addTimer: jest.fn() },
      recordInput: { submitTaskSession: jest.fn() },
      taskRuntime: { completeTask },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: () => ({ id: timer.taskId, coreBlock: 'task', status: 'open' }),
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];

    const ok = await new TimerService(useCases, dataStore, ui).stopAndApply(timer.id);
    expect(ok).toBe(true);
    expect(completeTask).toHaveBeenCalledWith({ taskId: timer.taskId, expectedTimerId: timer.id, source: 'timer' });
  });

  it('同一个正在运行的 Task 重复点击开始是幂等操作，不暂停、不切 Session、不新建 Timer', async () => {
    const timer: TimerState = {
      id: 'timer.same-running',
      taskId: 'task.01J00000000000000000000002',
      startedAt: new Date('2026-08-26T11:00:00').getTime(),
      startTime: new Date('2026-08-26T11:00:00').getTime(),
      elapsedSeconds: 0,
      status: 'running',
      source: 'timer',
    };
    const addTimer = jest.fn();
    const updateTimer = jest.fn();
    const submitTaskSession = jest.fn();
    const useCases = {
      timer: { getTimers: () => [timer], removeTimer: jest.fn(), updateTimer, addTimer },
      recordInput: { submitTaskSession },
      taskRuntime: { completeTask: jest.fn() },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: () => ({ id: timer.taskId, coreBlock: 'task', status: 'open' }),
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];

    await new TimerService(useCases, dataStore, ui).startOrResume(timer.taskId);

    expect(addTimer).not.toHaveBeenCalled();
    expect(updateTimer).not.toHaveBeenCalled();
    expect(submitTaskSession).not.toHaveBeenCalled();
  });

  it('切换到另一个 Task 时才暂停旧 running Timer，再启动新任务', async () => {
    let timers: TimerState[] = [{
      id: 'timer.old',
      taskId: 'task.01J00000000000000000000003',
      startedAt: new Date('2026-08-26T12:00:00').getTime(),
      startTime: new Date('2026-08-26T12:00:00').getTime(),
      elapsedSeconds: 0,
      status: 'running',
      source: 'timer',
    }];
    const targetTaskId = 'task.01J00000000000000000000004';
    const submitTaskSession = jest.fn(async () => ({ status: 'success' as const }));
    const updateTimer = jest.fn(async (next: TimerState) => {
      timers = timers.map((entry) => entry.id === next.id ? next : entry);
    });
    const addTimer = jest.fn(async (input: Omit<TimerState, 'id'>) => {
      const created = { ...input, id: 'timer.new' } as TimerState;
      timers.push(created);
      return created;
    });
    const useCases = {
      timer: { getTimers: () => timers, removeTimer: jest.fn(), updateTimer, addTimer },
      recordInput: { submitTaskSession },
      taskRuntime: { completeTask: jest.fn() },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: (id: string) => ({ id, coreBlock: 'task', status: 'open' }),
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(new Date('2026-08-26T12:15:00').getTime())
      .mockReturnValueOnce(new Date('2026-08-26T12:15:00').getTime());

    await new TimerService(useCases, dataStore, ui).startOrResume(targetTaskId);

    expect(submitTaskSession).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'task.01J00000000000000000000003',
      session: expect.objectContaining({ durationMinutes: 15, result: 'work-block-ended' }),
    }));
    expect(timers.find((entry) => entry.id === 'timer.old')?.status).toBe('paused');
    expect(addTimer).toHaveBeenCalledWith(expect.objectContaining({ taskId: targetTaskId, status: 'running' }));
  });


  it('已完成的一次性 Task 点击开始会创建新的 open Task，再对新 Task 开始计时，旧记录保持历史事实', async () => {
    const oldTaskId = 'task.01J00000000000000000000010';
    const newTaskId = 'task.01J00000000000000000000011';
    const records = new Map<string, Record<string, unknown>>([
      [oldTaskId, {
        id: oldTaskId,
        coreBlock: 'task',
        status: 'done',
        content: '八段锦',
        goalPath: '照顾好自己/运动',
        completedAt: '2026-08-28T20:00:00',
      }],
    ]);
    const timers: TimerState[] = [];
    const addTimer = jest.fn(async (input: Omit<TimerState, 'id'>) => {
      const created = { ...input, id: 'timer.repeat' } as TimerState;
      timers.push(created);
      return created;
    });
    const prepareEditRecord = jest.fn(() => ({
      blockId: 'core.task',
      template: { id: 'core.task' },
      initialFormData: {
        content: '八段锦',
        goalPath: '照顾好自己/运动',
        status: 'done',
        completedAt: '2026-08-28T20:00:00',
        expectedDurationMinutes: 30,
      },
    }));
    const submitCreateRecord = jest.fn(async (params: { formData: Record<string, unknown> }) => {
      expect(params.formData).toMatchObject({
        content: '八段锦',
        goalPath: '照顾好自己/运动',
        status: 'open',
        expectedDurationMinutes: 30,
      });
      expect(params.formData).not.toHaveProperty('completedAt');
      records.set(newTaskId, { id: newTaskId, coreBlock: 'task', status: 'open', content: '八段锦' });
      return { status: 'success' as const, affectedRecordId: newTaskId, followUp: { startTimerForRecordId: newTaskId } };
    });
    const useCases = {
      timer: { getTimers: () => timers, removeTimer: jest.fn(), updateTimer: jest.fn(), addTimer },
      recordInput: { prepareEditRecord, submitCreateRecord, submitTaskSession: jest.fn() },
      taskRuntime: { completeTask: jest.fn() },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: (id: string) => records.get(id) ?? null,
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];

    await new TimerService(useCases, dataStore, ui).startOrResume(oldTaskId);

    expect(prepareEditRecord).toHaveBeenCalledWith(expect.objectContaining({ item: expect.objectContaining({ id: oldTaskId }) }));
    expect(submitCreateRecord).toHaveBeenCalledTimes(1);
    expect(addTimer).toHaveBeenCalledWith(expect.objectContaining({ taskId: newTaskId, status: 'running' }));
    expect(records.get(oldTaskId)).toMatchObject({ status: 'done', completedAt: '2026-08-28T20:00:00' });
  });

  it('点击历史周期 Task 时若系列已有当前 open Task，直接开始当前实例，不复制第二条周期任务', async () => {
    const oldTaskId = 'task.01J00000000000000000000020';
    const currentTaskId = 'task.01J00000000000000000000021';
    const seriesId = 'taskseries.01J000000000000000000020';
    const records = new Map<string, Record<string, unknown>>([
      [oldTaskId, { id: oldTaskId, coreBlock: 'task', status: 'done', seriesId, content: '通勤' }],
      [seriesId, { id: seriesId, coreBlock: 'task-series', currentTaskId }],
      [currentTaskId, { id: currentTaskId, coreBlock: 'task', status: 'open', seriesId, content: '通勤' }],
    ]);
    const timers: TimerState[] = [];
    const addTimer = jest.fn(async (input: Omit<TimerState, 'id'>) => {
      const created = { ...input, id: 'timer.current-series' } as TimerState;
      timers.push(created);
      return created;
    });
    const prepareEditRecord = jest.fn();
    const submitCreateRecord = jest.fn();
    const useCases = {
      timer: { getTimers: () => timers, removeTimer: jest.fn(), updateTimer: jest.fn(), addTimer },
      recordInput: { prepareEditRecord, submitCreateRecord, submitTaskSession: jest.fn() },
      taskRuntime: { completeTask: jest.fn() },
    } as unknown as ConstructorParameters<typeof TimerService>[0];
    const dataStore = {
      getRecordById: (id: string) => records.get(id) ?? null,
    } as unknown as ConstructorParameters<typeof TimerService>[1];
    const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];

    await new TimerService(useCases, dataStore, ui).startOrResume(oldTaskId);

    expect(prepareEditRecord).not.toHaveBeenCalled();
    expect(submitCreateRecord).not.toHaveBeenCalled();
    expect(addTimer).toHaveBeenCalledWith(expect.objectContaining({ taskId: currentTaskId, status: 'running' }));
  });

});
