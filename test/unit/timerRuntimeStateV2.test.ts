import { TimerStateService } from '@core/services/TimerStateService';

function vaultWith(content: string | null) {
  return {
    readFile: jest.fn(async () => content),
    writeFile: jest.fn(async () => undefined),
  } as any;
}

describe('TimerRuntimeState v2', () => {
  it('discards legacy array history instead of keeping completed Timer entries', async () => {
    const vault = vaultWith(JSON.stringify([{ id: 'old', taskId: 'task.old', startTime: 1, elapsedSeconds: 2, status: 'feedback-recorded' }]));
    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([]);
  });

  it('loads only schema-v2 running/paused runtime entries', async () => {
    const timer = {
      id: 'timer.1', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 30, status: 'paused', source: 'timer',
    };
    const vault = vaultWith(JSON.stringify({ schemaVersion: 2, timers: [timer, { ...timer, id: 'bad', status: 'feedback-recorded' }] }));
    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([timer]);
  });

  it('persists only the runtime envelope', async () => {
    const vault = vaultWith(null);
    const service = new TimerStateService(vault);
    const timer = {
      id: 'timer.1', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 30, status: 'running' as const, source: 'energy-view' as const,
    };
    await service.saveStateToFile([timer]);
    const payload = JSON.parse(vault.writeFile.mock.calls[0][1]);
    expect(payload.schemaVersion).toBe(2);
    expect(payload.timers).toEqual([timer]);
  });
});
