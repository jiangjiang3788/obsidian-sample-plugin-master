/**
 * TimerStateService
 *
 * Runtime-only persistence for active/paused timers.
 * Completed work is never stored here; task-session Records own execution history.
 */

import { singleton, inject } from 'tsyringe';
import { DurableJsonStore } from '@/core/storage/DurableJsonStore';
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
    // Unsupported envelopes are reported by the caller, never treated as empty data.
    // Persistent TaskSession history is never stored here.
    if (!parsed || parsed.schemaVersion !== TIMER_RUNTIME_SCHEMA_VERSION || !Array.isArray(parsed.timers)) return null;
    if (!parsed.timers.every(isTimerRuntimeState)) return null;
    return { schemaVersion: TIMER_RUNTIME_SCHEMA_VERSION, timers: parsed.timers };
  } catch {
    return null;
  }
}

@singleton()
export class TimerStateService {
  private readonly json: DurableJsonStore;
  constructor(@inject(VAULT_PORT_TOKEN) private vault: VaultPort) {
    this.json = new DurableJsonStore(vault, new Set([THINK_STORAGE_PATHS.timerRuntime]));
  }

  async loadStateFromFile(): Promise<TimerState[]> {
    try {
      const raw = await this.json.readJSON<unknown>(THINK_STORAGE_PATHS.timerRuntime);
      const current = raw === null ? null : parseRuntimeState(JSON.stringify(raw));
      if (raw !== null && !current) throw new Error('计时器状态结构不受支持，请保留原文件后检查；不会作为空状态加载。');
      if (current) {
        await this.cleanupLegacyFile();
        return current.timers;
      }

      // One-time compatibility migration: older builds wrote this runtime-only
      // file into the Vault root. Move valid state into Think/ and remove the
      // obsolete root file so future timer activity never pollutes the root.
      const legacyText = await this.vault.readFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime);
      const legacy = parseRuntimeState(legacyText);
      if (legacyText !== null && !legacy) throw new Error('旧计时器状态无效，保留原文件并阻止空状态覆盖。');
      if (!legacy) return [];

      await this.writeRuntimeState(legacy.timers);
      await this.cleanupLegacyFile();
      return legacy.timers;
    } catch (error) {
      devWarn('Think Plugin: Failed to load timer runtime state from file.', error);
      throw error;
    }
  }

  async saveStateToFile(timers: TimerState[]): Promise<void> {
    try {
      await this.writeRuntimeState(timers);
      // Best-effort cleanup for users who upgrade while a legacy root file is
      // still present. deleteFile is a no-op when the file does not exist.
      await this.cleanupLegacyFile();
    } catch (error) {
      devWarn('Think Plugin: Failed to save timer runtime state to file.', error);
      throw error;
    }
  }

  private async cleanupLegacyFile(): Promise<void> {
    try { await this.vault.deleteFile(LEGACY_THINK_STORAGE_PATHS.timerRuntime); }
    catch (error) { devWarn('计时器主文件已验证，旧文件清理失败；保留旧文件供核对。', error); }
  }

  private async writeRuntimeState(timers: TimerState[]): Promise<void> {
    if (!timers.every(isTimerRuntimeState)) throw new Error('计时器状态无效，拒绝丢弃条目后保存。');
    const payload: PersistedTimerRuntimeState = {
      schemaVersion: TIMER_RUNTIME_SCHEMA_VERSION,
      timers,
    };
    await this.json.writeJSON(THINK_STORAGE_PATHS.timerRuntime, payload);
  }
}
