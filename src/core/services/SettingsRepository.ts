import { singleton, inject } from 'tsyringe';
import { produce } from 'immer';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { toCurrentThinkSettings } from '@/core/settings/currentSettingsSchema';
import { assertCanonicalGoalSettings } from '@/core/goal';
import type { ActionMeta } from '@/core/types/actionMeta';
import { logSettingsWrite, devWarn } from '@/core/utils/devLogger';
import { DurableSnapshot } from '@/core/storage/DurableSnapshot';
import { SETTINGS_PERSISTENCE_TOKEN, type ISettingsPersistence } from './SettingsPersistence';

export { SETTINGS_PERSISTENCE_TOKEN } from './SettingsPersistence';
export type { ISettingsPersistence } from './SettingsPersistence';

@singleton()
export class SettingsRepository {
  private readonly state: DurableSnapshot<ThinkSettings>;
  private readonly listeners = new Set<(settings: ThinkSettings) => void>();

  constructor(@inject(SETTINGS_PERSISTENCE_TOKEN) persistence: ISettingsPersistence) {
    this.state = new DurableSnapshot({
      load: async () => {
        const loaded = await persistence.load();
        // Loading is read-only, even on a genuinely new installation. Defaults are
        // persisted only by an explicit user mutation, never by startup or a cache miss.
        return toCurrentThinkSettings(loaded);
      },
      save: async (settings) => {
        assertCanonicalGoalSettings(settings.goalSettings);
        await persistence.save(settings);
      },
      committed: (_before, settings) => {
        for (const listener of this.listeners) {
          try { listener(settings); }
          catch (error) { devWarn('[SettingsRepository] 订阅者异常；已保存状态不回滚。', error); }
        }
      },
    });
  }

  subscribe(listener: (settings: ThinkSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  load(): Promise<ThinkSettings> { return this.state.load(); }
  getSettings(): ThinkSettings { return this.state.get(); }
  getSnapshot(): ThinkSettings { return this.state.get(); }

  async save(settings: ThinkSettings, meta?: ActionMeta): Promise<void> {
    const before = this.state.get();
    const snapshot = JSON.parse(JSON.stringify(settings)) as ThinkSettings;
    await this.state.replace(snapshot);
    logSettingsWrite(meta, before, snapshot);
  }

  async update(mutator: (draft: ThinkSettings) => void, meta?: ActionMeta): Promise<ThinkSettings> {
    let before: ThinkSettings | undefined;
    const result = await this.state.update((current) => {
      before = current;
      return produce(current, mutator);
    });
    if (before !== result) logSettingsWrite(meta, before, result);
    return result;
  }
}
