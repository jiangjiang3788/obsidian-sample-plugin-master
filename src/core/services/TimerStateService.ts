/**
 * TimerStateService
 *
 * Runtime-only persistence for active/paused timers.
 * Completed work is never stored here; task-session Records own execution history.
 */

import { singleton, inject } from 'tsyringe';
import type { TimerState } from '@core/types/timer';
import type { VaultPort } from '@core/ports/VaultPort';
import { VAULT_PORT_TOKEN } from '@core/ports/VaultPort';
import { devWarn } from '@core/utils/devLogger';

const TIMER_STATE_PATH = 'think-plugin-timer-state.json';
const TIMER_RUNTIME_SCHEMA_VERSION = 2;

interface PersistedTimerRuntimeState {
  schemaVersion: number;
  timers: TimerState[];
}

function isTimerRuntimeState(entry: unknown): entry is TimerState {
  if (!entry || typeof entry !== 'object') return false;
  const timer = entry as Partial<TimerState>;
  return typeof timer.id === 'string'
    && timer.id.length > 0
    && typeof timer.taskId === 'string'
    && timer.taskId.length > 0
    && typeof timer.startedAt === 'number'
    && Number.isFinite(timer.startedAt)
    && typeof timer.startTime === 'number'
    && Number.isFinite(timer.startTime)
    && typeof timer.elapsedSeconds === 'number'
    && Number.isFinite(timer.elapsedSeconds)
    && (timer.status === 'running' || timer.status === 'paused')
    && (timer.source === 'timer' || timer.source === 'energy-view');
}

@singleton()
export class TimerStateService {
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {}

  async loadStateFromFile(): Promise<TimerState[]> {
    try {
      const content = await this.vault.readFile(TIMER_STATE_PATH);
      if (!content) return [];

      const parsed = JSON.parse(content) as Partial<PersistedTimerRuntimeState>;
      // Breaking cutover: legacy array payloads and old completed/history entries are discarded.
      if (!parsed || parsed.schemaVersion !== TIMER_RUNTIME_SCHEMA_VERSION || !Array.isArray(parsed.timers)) return [];
      return parsed.timers.filter(isTimerRuntimeState);
    } catch (error) {
      devWarn('Think Plugin: Failed to load timer runtime state from file.', error);
      return [];
    }
  }

  async saveStateToFile(timers: TimerState[]): Promise<void> {
    try {
      const runtimeTimers = timers.filter(isTimerRuntimeState);
      const payload: PersistedTimerRuntimeState = {
        schemaVersion: TIMER_RUNTIME_SCHEMA_VERSION,
        timers: runtimeTimers,
      };
      await this.vault.writeFile(TIMER_STATE_PATH, JSON.stringify(payload, null, 2));
    } catch (error) {
      devWarn('Think Plugin: Failed to save timer runtime state to file.', error);
    }
  }
}
