/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/unit
 */
import { TimerStateService } from '@core/services/TimerStateService';

function vaultWith(content: string | null) {
  return {
    readFile: jest.fn(async () => content),
    writeFile: jest.fn(async () => undefined),
    deleteFile: jest.fn(async () => undefined),
  } as any;
}

describe('TimerRuntimeState v3', () => {
  it('discards legacy array history instead of keeping completed Timer entries', async () => {
    const vault = vaultWith(JSON.stringify([{ id: 'old', taskId: 'task.old', startTime: 1, elapsedSeconds: 2, status: 'feedback-recorded' }]));
    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([]);
  });

  it('discards schema-v2 envelopes because their paused elapsed time was not persisted as Sessions yet', async () => {
    const timer = {
      id: 'timer.legacy', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 600, status: 'paused', source: 'timer',
    };
    const vault = vaultWith(JSON.stringify({ schemaVersion: 2, timers: [timer] }));
    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([]);
  });

  it('loads only schema-v3 running/paused runtime entries', async () => {
    const timer = {
      id: 'timer.1', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 30, status: 'paused', source: 'timer',
    };
    const vault = vaultWith(JSON.stringify({ schemaVersion: 3, timers: [timer, { ...timer, id: 'bad', status: 'feedback-recorded' }] }));
    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([timer]);
    expect(vault.readFile).toHaveBeenCalledWith('Think/timer-state.json');
  });

  it('persists timer runtime state under Think instead of the Vault root', async () => {
    const vault = vaultWith(null);
    const service = new TimerStateService(vault);
    const timer = {
      id: 'timer.1', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 30, status: 'running' as const, source: 'energy-view' as const,
    };
    await service.saveStateToFile([timer]);
    expect(vault.writeFile.mock.calls[0][0]).toBe('Think/timer-state.json');
    const payload = JSON.parse(vault.writeFile.mock.calls[0][1]);
    expect(payload.schemaVersion).toBe(3);
    expect(payload.timers).toEqual([timer]);
    expect(vault.deleteFile).toHaveBeenCalledWith('think-plugin-timer-state.json');
  });

  it('migrates a valid legacy root timer file into Think and removes the root copy', async () => {
    const timer = {
      id: 'timer.migrate', taskId: 'task.01J00000000000000000000000', startedAt: 10, startTime: 20,
      elapsedSeconds: 30, status: 'paused' as const, source: 'timer' as const,
    };
    const legacyPayload = JSON.stringify({ schemaVersion: 3, timers: [timer] });
    const vault = {
      readFile: jest.fn(async (path: string) => path === 'think-plugin-timer-state.json' ? legacyPayload : null),
      writeFile: jest.fn(async () => undefined),
      deleteFile: jest.fn(async () => undefined),
    } as any;

    const service = new TimerStateService(vault);
    await expect(service.loadStateFromFile()).resolves.toEqual([timer]);
    expect(vault.writeFile).toHaveBeenCalledWith('Think/timer-state.json', expect.any(String));
    expect(vault.deleteFile).toHaveBeenCalledWith('think-plugin-timer-state.json');
  });
});
