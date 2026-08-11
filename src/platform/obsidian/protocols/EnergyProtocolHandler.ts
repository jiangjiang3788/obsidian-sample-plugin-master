import dayjs from 'dayjs';
import { Notice, type Plugin } from 'obsidian';
import type { ThinkSettings } from '@core/types/public';
import {
  ENERGY_PROTOCOL_ACTION,
  parseEnergyProtocolParams,
  resolveEnergyCaptureGoal,
} from '@core/energy/public';
import type { EnergySnapshotInput } from '@core/energy/public';
import type { RecordSubmitResult } from '@core/recordInput/public';

export interface EnergyProtocolHandlerDeps {
  getSettings: () => ThinkSettings;
  recordInput: { submitEnergySnapshot: (input: EnergySnapshotInput) => Promise<RecordSubmitResult> };
}

export function registerEnergyProtocolHandler(plugin: Plugin, deps: EnergyProtocolHandlerDeps): void {
  plugin.registerObsidianProtocolHandler(ENERGY_PROTOCOL_ACTION, async (params) => {
    const parsed = parseEnergyProtocolParams(params);
    if (!parsed.ok) {
      new Notice(`Think OS: ${parsed.message}`, 5000);
      return;
    }

    const settings = deps.getSettings();
    const goal = resolveEnergyCaptureGoal(
      settings.goalSettings?.goals || [],
      settings.energySettings?.defaultGoalId,
    );
    if (!goal) {
      new Notice('Think OS: 没有可用于精力记录的目标，请先在设置中创建/选择默认精力目标。', 6000);
      return;
    }

    const now = dayjs();
    const common = {
      goalId: goal.id,
      goalPath: goal.goalPath || goal.title,
      themePath: goal.themePath || undefined,
      date: now.format('YYYY-MM-DD'),
      time: now.format('HH:mm'),
      captureMode: 'realtime' as const,
      timePrecision: 'exact' as const,
      source: 'ios-shortcut',
    };

    const result = parsed.payload.mode === 'quick'
      ? await deps.recordInput.submitEnergySnapshot({
          ...common,
          scoreMode: 'quick',
          score: parsed.payload.score,
        })
      : await deps.recordInput.submitEnergySnapshot({
          ...common,
          scoreMode: 'detailed',
          brainScore: parsed.payload.brainScore,
          physicalScore: parsed.payload.physicalScore,
        });

    if (result.status === 'success') {
      new Notice(result.feedback?.notice || 'Think OS: 精力已记录', 1800);
      return;
    }
    const issue = result.errors?.[0]?.message || result.feedback?.notice || '精力记录失败';
    new Notice(`Think OS: ${issue}`, 5000);
  });
}
