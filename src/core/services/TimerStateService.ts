// src/core/services/TimerStateService.ts
/**
 * TimerStateService
 *
 * Role: Core Service (IO)
 *
 * 说明：
 * - 这是一个纯“计时器状态持久化”服务，负责把 TimerState[] 写入/读取到 vault adapter。
 * - 它不应该放在 features（UI 层），否则会出现 UseCases -> features 的反向依赖。
 * - 迁移到 core/services 后：
 *   - app/usecases 可以依赖它（应用层依赖 core）
 *   - features 只通过 UseCases 触发写入，不直接依赖持久化细节
 */

import { singleton, inject } from 'tsyringe';
import type { TimerState, TimerStatus } from '@core/types/timer';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import { devWarn } from '@core/utils/devLogger';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

@singleton()
export class TimerStateService {
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {}

  async loadStateFromFile(): Promise<TimerState[]> {
    try {
      const content = await this.vault.readFile(TIMER_STATE_PATH);
      if (!content) return [];

      const timers = JSON.parse(content);
      if (!Array.isArray(timers)) return [];

      // Timer state lives across plugin upgrades. Never allow malformed or
      // partially-written JSON entries to poison workspace bootstrap.
      const allowedStatuses = new Set<TimerStatus>([
        'running',
        'paused',
        'awaiting-energy',
        'feedback-recorded',
      ]);

      return timers.filter((entry: unknown): entry is TimerState => {
        if (!entry || typeof entry !== 'object') return false;
        const timer = entry as Partial<TimerState>;
        return typeof timer.id === 'string'
          && timer.id.length > 0
          && typeof timer.taskId === 'string'
          && timer.taskId.length > 0
          && typeof timer.startTime === 'number'
          && Number.isFinite(timer.startTime)
          && typeof timer.elapsedSeconds === 'number'
          && Number.isFinite(timer.elapsedSeconds)
          && typeof timer.status === 'string'
          && allowedStatuses.has(timer.status as TimerStatus);
      });
    } catch (error) {
      devWarn('Think Plugin: Failed to load timer state from file.', error);
      return [];
    }
  }

  async saveStateToFile(timers: TimerState[]): Promise<void> {
    try {
      const content = JSON.stringify(timers, null, 2);
      await this.vault.writeFile(TIMER_STATE_PATH, content);
    } catch (error) {
      devWarn('Think Plugin: Failed to save timer state to file.', error);
    }
  }
}
