/**
 * GoalUseCase - 目标中心相关用例
 *
 * 目标：把 GoalSettings 的写操作收敛到 UseCase 层，避免 UI 直接改 settings。
 * 单人版：目标只保留实体和记录预设；周期由 periodPolicy + 记录日期运行时推导。
 */

import type {
  GoalDefinition,
  GoalMetricContract,
  GoalSettings,
  GoalTemplate,
  PeriodPolicy,
} from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import {
  DEFAULT_GOAL_SETTINGS,
  getGoalTemplateId,
  upsertGoalTemplateInSettings,
  removeGoalTemplateFromSettings,
  removeGoalTemplatesForGoal,
  compactGoalTemplateForStorage,
  cleanupGoalTemplateStorage,
  requireGoalPath,
} from '@core/goal/public';
import { getCoreBlockById } from '@core/blocks/public';
import { devError } from '@core/utils/public';
import type { AppStoreApi } from './AppStoreApi';

export interface AddGoalInput {
  path: string;
  description?: string;
  status?: GoalDefinition['status'];
}

export interface UpsertGoalTemplateInput {
  goalPath: string;
  coreBlockId: string;
  description?: string;
  enabled?: boolean;
  targetFile?: string;
  appendUnderHeader?: string;
  fields?: TemplateField[];
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
  periodPolicy?: PeriodPolicy;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureGoalSettings(settings?: GoalSettings): GoalSettings {
  return {
    goals: [...(settings?.goals || [])],
    goalTemplates: [...(settings?.goalTemplates || [])],
  };
}

function normalizeGoalInput(input: AddGoalInput): GoalDefinition {
  const path = requireGoalPath(input.path);
  const timestamp = nowIso();
  return {
    path,
    description: input.description,
    status: input.status || 'active',
    metrics: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function collectGoalCascadePaths(goals: GoalDefinition[], path: string): string[] {
  const targetPath = requireGoalPath(path);
  if (!goals.some((goal) => goal.path === targetPath)) return [];
  return goals
    .filter((goal) => goal.path === targetPath || goal.path.startsWith(`${targetPath}/`))
    .map((goal) => goal.path);
}

export class GoalUseCase {
  constructor(private store: AppStoreApi) {}

  async addGoal(input: AddGoalInput): Promise<GoalDefinition | null> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return null;
      const goal = normalizeGoalInput(input);
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const exists = draft.goalSettings.goals.some((item) => item.path === goal.path);
        if (!exists) draft.goalSettings.goals.push(goal);
      });
      return goal;
    } catch (error) {
      devError('[GoalUseCase] addGoal failed:', error);
      throw error;
    }
  }

  async updateGoal(path: string, patch: Partial<Omit<GoalDefinition, 'path'>>): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      const canonicalPath = requireGoalPath(path);
      const safePatch = { ...patch } as Partial<Omit<GoalDefinition, 'path'>> & { granularity?: unknown; path?: unknown };
      delete safePatch.granularity;
      delete safePatch.path;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const target = draft.goalSettings.goals.find((goal) => goal.path === canonicalPath);
        if (!target) return;
        Object.assign(target, safePatch, { updatedAt: nowIso() });
      });
    } catch (error) {
      devError('[GoalUseCase] updateGoal failed:', error);
      throw error;
    }
  }

  async archiveGoal(path: string): Promise<void> {
    await this.updateGoal(path, { status: 'archived' });
  }

  async restoreGoal(path: string): Promise<void> {
    await this.updateGoal(path, { status: 'active' });
  }

  async updateGoalMetrics(path: string, metrics: GoalMetricContract[]): Promise<void> {
    await this.updateGoal(path, { metrics });
  }

  async pauseGoal(path: string): Promise<void> {
    await this.updateGoal(path, { status: 'paused' });
  }

  async completeGoal(path: string): Promise<void> {
    await this.updateGoal(path, { status: 'completed' });
  }

  private async deleteGoalsByPaths(paths: string[]): Promise<void> {
    const uniquePaths = Array.from(new Set(paths.filter(Boolean).map((path) => requireGoalPath(path))));
    if (!uniquePaths.length) return;
    const targetPaths = new Set(uniquePaths);
    const state = this.store.getState();
    if (!state.isInitialized) return;
    await state.updateSettings((draft) => {
      draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
      draft.goalSettings.goals = draft.goalSettings.goals.filter((goal) => !targetPaths.has(goal.path));
      for (const targetPath of targetPaths) {
        draft.goalSettings = removeGoalTemplatesForGoal(draft.goalSettings, targetPath);
      }
    });
  }

  async deleteGoal(path: string): Promise<void> {
    try {
      await this.deleteGoalsByPaths([path]);
    } catch (error) {
      devError('[GoalUseCase] deleteGoal failed:', error);
      throw error;
    }
  }

  async deleteGoalCascade(path: string): Promise<number> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return 0;
      const goalSettings = ensureGoalSettings(state.settings.goalSettings || DEFAULT_GOAL_SETTINGS);
      const paths = collectGoalCascadePaths(goalSettings.goals, path);
      await this.deleteGoalsByPaths(paths);
      return paths.length;
    } catch (error) {
      devError('[GoalUseCase] deleteGoalCascade failed:', error);
      throw error;
    }
  }

  async cleanupGoalSettings(): Promise<{
    beforeTemplateCount: number;
    afterTemplateCount: number;
    removedDuplicateTemplates: number;
    changed: boolean;
  }> {
    try {
      const state = this.store.getState();
      const fallback = {
        beforeTemplateCount: 0,
        afterTemplateCount: 0,
        removedDuplicateTemplates: 0,
        changed: false,
      };
      if (!state.isInitialized) return fallback;

      let summary = fallback;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const cleaned = cleanupGoalTemplateStorage(draft.goalSettings);
        draft.goalSettings = cleaned.goalSettings;
        summary = {
          beforeTemplateCount: cleaned.summary.beforeCount,
          afterTemplateCount: cleaned.summary.afterCount,
          removedDuplicateTemplates: cleaned.summary.removedDuplicateCount,
          changed: cleaned.summary.changed,
        };
      });
      return summary;
    } catch (error) {
      devError('[GoalUseCase] cleanupGoalSettings failed:', error);
      throw error;
    }
  }

  async upsertGoalTemplate(template: GoalTemplate): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const next = { ...template, id: getGoalTemplateId(template.goalPath, template.coreBlockId) };
        const coreBlock = getCoreBlockById(draft as any, next.coreBlockId);
        draft.goalSettings = upsertGoalTemplateInSettings(draft.goalSettings, compactGoalTemplateForStorage(next, { coreBlock }));
      });
    } catch (error) {
      devError('[GoalUseCase] upsertGoalTemplate failed:', error);
      throw error;
    }
  }

  async upsertGoalTemplateDraft(input: UpsertGoalTemplateInput): Promise<void> {
    await this.upsertGoalTemplate({
      id: getGoalTemplateId(input.goalPath, input.coreBlockId),
      goalPath: input.goalPath,
      coreBlockId: input.coreBlockId,
      description: input.description,
      enabled: input.enabled !== false,
      targetFile: input.targetFile?.trim() || undefined,
      appendUnderHeader: input.appendUnderHeader?.trim() || undefined,
      fields: input.fields,
      defaultValues: input.defaultValues || {},
      requiredFields: input.requiredFields || [],
      periodPolicy: input.periodPolicy,
    });
  }

  async deleteGoalTemplate(goalPath: string, coreBlockId: string): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        draft.goalSettings = removeGoalTemplateFromSettings(draft.goalSettings, goalPath, coreBlockId);
      });
    } catch (error) {
      devError('[GoalUseCase] deleteGoalTemplate failed:', error);
      throw error;
    }
  }
}

export function createGoalUseCase(store: AppStoreApi): GoalUseCase {
  return new GoalUseCase(store);
}
