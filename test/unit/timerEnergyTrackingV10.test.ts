/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/unit
 * @covers F056/regression
 * @covers F061/unit
 */
import { TimerService } from '@/features/timer/TimerService';
import type { TimerState } from '@core/types/public';

function task(taskId: string) {
  return { id: taskId, coreBlock: 'task', status: 'open', title: '写代码', goalPath: '爱好能力/武装大脑' };
}

function makeRuntime(initial: TimerState[]) {
  let timers = initial.map((timer) => ({ ...timer }));
  const submittedSessions: Array<Record<string, unknown>> = [];
  const submittedEnergy: Array<Record<string, unknown>> = [];
  let energySeq = 0;

  const useCases = {
    timer: {
      getTimers: () => timers,
      updateTimer: jest.fn(async (next: TimerState) => {
        timers = timers.map((timer) => timer.id === next.id ? next : timer);
      }),
      addTimer: jest.fn(),
      removeTimer: jest.fn(async (id: string) => { timers = timers.filter((timer) => timer.id !== id); }),
    },
    recordInput: {
      submitTaskSession: jest.fn(async (params: Record<string, unknown>) => {
        submittedSessions.push(params);
        return { status: 'success' as const };
      }),
      submitEnergySnapshot: jest.fn(async (params: Record<string, unknown>) => {
        submittedEnergy.push(params);
        energySeq += 1;
        return { status: 'success' as const, affectedRecordId: `energy.${energySeq}` };
      }),
    },
    taskRuntime: {
      completeTask: jest.fn(async () => ({ status: 'success' as const, feedback: { notice: '任务已完成。' } })),
    },
  } as unknown as ConstructorParameters<typeof TimerService>[0];
  const dataStore = {
    getRecordById: (id: string) => task(id),
  } as unknown as ConstructorParameters<typeof TimerService>[1];
  const ui = { notice: jest.fn() } as unknown as ConstructorParameters<typeof TimerService>[2];
  const service = new TimerService(useCases, dataStore, ui);

  return { service, useCases, submittedSessions, submittedEnergy, getTimers: () => timers };
}

describe('Timer before/after Energy tracking V10', () => {
  afterEach(() => jest.restoreAllMocks());

  it('运行中开启跟踪会先记录开始精力，并在测量点切开旧的未跟踪工作段', async () => {
    const taskId = 'task.energy.1';
    const start = new Date('2026-08-29T09:00:00').getTime();
    const measuredAt = new Date('2026-08-29T09:10:00').getTime();
    const runtime = makeRuntime([{
      id: 'timer.energy.1', taskId, startedAt: start, startTime: start,
      elapsedSeconds: 0, status: 'running', source: 'timer',
    }]);
    runtime.service.setEnergyCaptureHandler(async (request) => {
      expect(request).toMatchObject({ phase: 'start', reason: 'tracking-enabled', taskId });
      return 80;
    });
    jest.spyOn(Date, 'now').mockReturnValue(measuredAt);

    const ok = await runtime.service.captureCurrentSegmentEnergy('timer.energy.1');

    expect(ok).toBe(true);
    expect(runtime.submittedEnergy).toEqual([expect.objectContaining({
      goalPath: '爱好能力/武装大脑',
      score: 80,
      source: 'timer-energy-start',
      linkFinishedSession: false,
    })]);
    expect(runtime.submittedSessions).toEqual([expect.objectContaining({
      itemId: taskId,
      session: expect.objectContaining({ durationMinutes: 10, startEnergyRecordId: undefined }),
    })]);
    expect(runtime.getTimers()[0]).toMatchObject({
      status: 'running',
      startTime: measuredAt,
      elapsedSeconds: 600,
      energyTracking: { enabled: true, baselineScore: 80, baselineEnergyItemId: 'energy.1' },
    });
  });

  it('暂停跟踪中的工作段会把开始精力写进 Session，再采集结束精力用于自动配对', async () => {
    const taskId = 'task.energy.2';
    const start = new Date('2026-08-29T10:00:00').getTime();
    const endedAt = new Date('2026-08-29T10:30:00').getTime();
    const runtime = makeRuntime([{
      id: 'timer.energy.2', taskId, startedAt: start, startTime: start,
      elapsedSeconds: 0, status: 'running', source: 'timer',
      energyTracking: { enabled: true, baselineScore: 76, baselineEnergyItemId: 'energy.before' },
    }]);
    runtime.service.setEnergyCaptureHandler(async (request) => {
      expect(request).toMatchObject({ phase: 'end', reason: 'pause', baselineScore: 76 });
      return 54;
    });
    jest.spyOn(Date, 'now').mockReturnValue(endedAt);

    const ok = await runtime.service.pause('timer.energy.2');

    expect(ok).toBe(true);
    expect(runtime.submittedSessions[0]).toEqual(expect.objectContaining({
      session: expect.objectContaining({
        durationMinutes: 30,
        startEnergyRecordId: 'energy.before',
        result: 'work-block-ended',
      }),
    }));
    expect(runtime.submittedEnergy[0]).toEqual(expect.objectContaining({
      score: 54,
      source: 'timer-energy-end',
      linkFinishedSession: true,
    }));
    expect(runtime.getTimers()[0]).toMatchObject({ status: 'paused', energyTracking: { enabled: false } });
    expect(runtime.getTimers()[0].energyTracking?.baselineEnergyItemId).toBeUndefined();
  });

  it('一次精力采样只覆盖当前连续工作段，暂停后继续不会自动再次弹精力', async () => {
    const taskId = 'task.energy.3';
    const runtime = makeRuntime([{
      id: 'timer.energy.3', taskId, startedAt: 1000, startTime: 1000,
      elapsedSeconds: 1200, status: 'paused', source: 'timer', energyTracking: { enabled: false },
    }]);
    const capture = jest.fn(async () => 80);
    runtime.service.setEnergyCaptureHandler(capture);
    jest.spyOn(Date, 'now').mockReturnValue(5000);

    await runtime.service.resume('timer.energy.3');

    expect(capture).not.toHaveBeenCalled();
    expect(runtime.submittedEnergy).toHaveLength(0);
    expect(runtime.getTimers()[0]).toMatchObject({
      status: 'running', startTime: 5000, energyTracking: { enabled: false },
    });
  });

  it('运行中关闭跟踪会先封存已测量工作段、记录结束精力，再从同一时刻继续普通计时', async () => {
    const taskId = 'task.energy.4';
    const start = new Date('2026-08-29T11:00:00').getTime();
    const endedAt = new Date('2026-08-29T11:25:00').getTime();
    const runtime = makeRuntime([{
      id: 'timer.energy.4', taskId, startedAt: start, startTime: start,
      elapsedSeconds: 300, status: 'running', source: 'timer',
      energyTracking: { enabled: true, baselineScore: 62, baselineEnergyItemId: 'energy.before.4' },
    }]);
    runtime.service.setEnergyCaptureHandler(async (request) => {
      expect(request).toMatchObject({ phase: 'end', reason: 'end-work-block' });
      return 70;
    });
    jest.spyOn(Date, 'now').mockReturnValue(endedAt);

    const ok = await runtime.service.setEnergyTrackingEnabled('timer.energy.4', false);

    expect(ok).toBe(true);
    expect(runtime.submittedSessions[0]).toEqual(expect.objectContaining({
      session: expect.objectContaining({ durationMinutes: 25, startEnergyRecordId: 'energy.before.4' }),
    }));
    expect(runtime.submittedEnergy[0]).toEqual(expect.objectContaining({
      score: 70, source: 'timer-energy-end', linkFinishedSession: true,
    }));
    expect(runtime.getTimers()[0]).toMatchObject({
      status: 'running', startTime: endedAt, elapsedSeconds: 1800, energyTracking: { enabled: false },
    });
  });
});
