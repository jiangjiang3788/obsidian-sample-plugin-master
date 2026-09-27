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
import { LEGACY_THINK_STORAGE_PATHS, THINK_STORAGE_PATHS } from './StorageService';

const TIMER_RUNTIME_SCHEMA_VERSION = 3;

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

function parseRuntimeState(content: string | null): PersistedTimerRuntimeState | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as Partial<PersistedTimerRuntimeState>;
    // Breaking cutover: legacy arrays and pre-segmented runtime envelopes are discarded.
    // Persistent TaskSession history is never stored here.
    if (!parsed || parsed.schemaVersion !== TIMER_RUNTIME_SCHEMA_VERSION || !Array.isArray(parsed.timers)) return null;
    return {
      schemaVersion: TIMER_RUNTIME_SCHEMA_VERSION,
      timers: parsed.timers.filter(isTimerRuntimeState),
    };
  } catch {
    return null;
  }
}

@singleton()
export class TimerStateService {
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {}

  async loadStateFromFile(): Promise<TimerState[]> {
    try {
      const current = parseRuntimeState(await this.vault.readFile(THINK_STORAGE_PATHS.timerRuntime));
      if (current) {
        await this.vault.deleteFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime);
        return current.timers;
      }

      // One-time compatibility migration: older builds wrote this runtime-only
      // file into the Vault root. Move valid state into Think/ and remove the
      // obsolete root file so future timer activity never pollutes the root.
      const legacy = parseRuntimeState(await this.vault.readFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime));
      if (!legacy) return [];

      await this.writeRuntimeState(legacy.timers);
      await this.vault.deleteFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime);
      return legacy.timers;
    } catch (error) {
      devWarn('Think Plugin: Failed to load timer runtime state from file.', error);
      return [];
    }
  }

  async saveStateToFile(timers: TimerState[]): Promise<void> {
    try {
      await this.writeRuntimeState(timers);
      // Best-effort cleanup for users who upgrade while a legacy root file is
      // still present. deleteFile is a no-op when the file does not exist.
      await this.vault.deleteFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime);
    } catch (error) {
      devWarn('Think Plugin: Failed to save timer runtime state to file.', error);
    }
  }

  private async writeRuntimeState(timers: TimerState[]): Promise<void> {
    const payload: PersistedTimerRuntimeState = {
      schemaVersion: TIMER_RUNTIME_SCHEMA_VERSION,
      timers: timers.filter(isTimerRuntimeState),
    };
    await this.vault.writeFile(THINK_STORAGE_PATHS.timerRuntime, JSON.stringify(payload, null, 2));
  }
}
