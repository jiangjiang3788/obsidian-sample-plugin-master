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
import { App } from 'obsidian';
import type { TimerState } from '@core/types/timer';
import { AppToken } from '@core/services/types';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';

@singleton()
export class TimerStateService {
  constructor(@inject(AppToken) private app: App) {}

  async loadStateFromFile(): Promise<TimerState[]> {
    try {
      const fileExists = await this.app.vault.adapter.exists(TIMER_STATE_PATH);
      if (!fileExists) return [];

      const content = await this.app.vault.adapter.read(TIMER_STATE_PATH);
      if (!content) return [];

      const timers = JSON.parse(content);
      return Array.isArray(timers) ? timers : [];
    } catch (error) {
      console.error('Think Plugin: Failed to load timer state from file.', error);
      return [];
    }
  }

  async saveStateToFile(timers: TimerState[]): Promise<void> {
    try {
      const content = JSON.stringify(timers, null, 2);
      await this.app.vault.adapter.write(TIMER_STATE_PATH, content);
    } catch (error) {
      console.error('Think Plugin: Failed to save timer state to file.', error);
    }
  }
}
