/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/error
 * @covers F056/regression
 * @covers F056/restart
 * @covers F126/error
 * @covers F126/integration
 * @covers F126/persistence
 * @covers F126/restart
 */
import type { VaultPort } from '@/core/ports/VaultPort';
import { TimerStateService } from '@/core/services/TimerStateService';

function createVault() {
  const files = new Map<string, string>();
  const vault: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    listMarkdownFilePaths: () => [...files.keys()].filter((path) => path.endsWith('.md')),
    writeFile: jest.fn(async (path, content) => { files.set(path, content); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); }),
  };
  return { files, vault };
}

describe('P0 Timer 运行态重启恢复', () => {
  it('运行/暂停中的 Timer 保存后，新 Service 实例可以从同一 Vault 文件恢复', async () => {
    const h = createVault();
    const first = new TimerStateService(h.vault);
    const timers = [
      {
        id: 'timer.running',
        taskId: 'task.01J00000000000000000000000',
        startedAt: 100,
        startTime: 100,
        elapsedSeconds: 12,
        status: 'running' as const,
        source: 'timer' as const,
      },
      {
        id: 'timer.paused',
        taskId: 'task.01J00000000000000000000001',
        startedAt: 200,
        startTime: 200,
        elapsedSeconds: 88,
        status: 'paused' as const,
        source: 'energy-view' as const,
      },
    ];

    await first.saveStateToFile(timers);
    expect(h.files.has('think-plugin-timer-state.json')).toBe(true);

    const restarted = new TimerStateService(h.vault);
    await expect(restarted.loadStateFromFile()).resolves.toEqual(timers);
  });

  it('运行态文件损坏时返回空状态，不把损坏 JSON 传播到启动流程', async () => {
    const h = createVault();
    h.files.set('think-plugin-timer-state.json', '{ definitely not json');
    const restarted = new TimerStateService(h.vault);
    await expect(restarted.loadStateFromFile()).resolves.toEqual([]);
  });
});
