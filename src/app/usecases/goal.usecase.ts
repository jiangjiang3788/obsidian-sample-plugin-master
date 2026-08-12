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
  makeStableGoalIdFromPath,
  requireGoalPath,
  splitGoalPath,
} from '@core/goal/public';
import { getCoreBlockById } from '@core/blocks/public';
import { devError } from '@core/utils/public';
import type { AppStoreApi } from './AppStoreApi';

export interface AddGoalInput {
  title: string;
  goalPath?: string;
  description?: string;
  themePath?: string | null;
  status?: GoalDefinition['status'];
}

export interface UpsertGoalTemplateInput {
  goalId: string;
  coreBlockId: string;
  templateVariantId?: string;
  templateName?: string;
  description?: string;
  sortOrder?: number;
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
  const goalPath = requireGoalPath(input.goalPath || input.title);
  const title = String(input.title || '').trim() || goalPath.split('/').filter(Boolean).pop() || goalPath;
  if (title.includes('#') || title.includes('＃')) throw new Error('Goal title must not contain # markers.');
  const timestamp = nowIso();
  return {
    id: makeStableGoalIdFromPath(goalPath),
    title,
    goalPath,
    description: input.description,
    status: input.status || 'active',
    parentGoalId: null,
    themePath: input.themePath ?? null,
    metrics: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizeStoredGoalPath(goal: Pick<GoalDefinition, 'goalPath' | 'title'>): string {
  return requireGoalPath(goal.goalPath || goal.title);
}


function collectGoalCascadeIds(goals: GoalDefinition[], id: string): string[] {
  const target = goals.find((goal) => goal.id === id);
  if (!target) return [];
  const targetPath = normalizeStoredGoalPath(target);
  return goals
    .filter((goal) => {
      if (goal.id === id) return true;
      const path = normalizeStoredGoalPath(goal);
      return !!targetPath && path.startsWith(`${targetPath}/`);
    })
    .map((goal) => goal.id);
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
        const exists = draft.goalSettings.goals.some((item) => item.id === goal.id || normalizeStoredGoalPath(item) === goal.goalPath);
        if (!exists) draft.goalSettings.goals.push(goal);
      });
      return goal;
    } catch (error) {
      devError('[GoalUseCase] addGoal failed:', error);
      throw error;
    }
  }

  async updateGoal(id: string, patch: Partial<GoalDefinition>): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      const safePatch = { ...patch } as Partial<GoalDefinition> & { granularity?: unknown };
      delete safePatch.granularity;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const target = draft.goalSettings.goals.find((goal) => goal.id === id);
        if (!target) return;
        Object.assign(target, safePatch, { updatedAt: nowIso() });
        if (safePatch.title !== undefined) {
          const title = String(target.title || '').trim();
          if (!title || title.includes('#') || title.includes('＃')) throw new Error('Goal title must not contain # markers.');
          target.title = title;
        }
        if (safePatch.goalPath || safePatch.title) target.goalPath = requireGoalPath(target.goalPath || target.title);
      });
    } catch (error) {
      devError('[GoalUseCase] updateGoal failed:', error);
      throw error;
    }
  }

  async archiveGoal(id: string): Promise<void> {
    await this.updateGoal(id, { status: 'archived' });
  }

  async restoreGoal(id: string): Promise<void> {
    await this.updateGoal(id, { status: 'active' });
  }

  async updateGoalMetrics(id: string, metrics: GoalMetricContract[]): Promise<void> {
    await this.updateGoal(id, { metrics });
  }

  async pauseGoal(id: string): Promise<void> {
    await this.updateGoal(id, { status: 'paused' });
  }

  async completeGoal(id: string): Promise<void> {
    await this.updateGoal(id, { status: 'completed' });
  }

  private async deleteGoalsByIds(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return;
    const targetIds = new Set(uniqueIds);
    const state = this.store.getState();
    if (!state.isInitialized) return;
    await state.updateSettings((draft) => {
      draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
      draft.goalSettings.goals = draft.goalSettings.goals.filter((goal) => !targetIds.has(goal.id));
      for (const targetId of targetIds) {
        draft.goalSettings = removeGoalTemplatesForGoal(draft.goalSettings, targetId);
      }
    });
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      await this.deleteGoalsByIds([id]);
    } catch (error) {
      devError('[GoalUseCase] deleteGoal failed:', error);
      throw error;
    }
  }

  async deleteGoalCascade(id: string): Promise<number> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return 0;
      const goalSettings = ensureGoalSettings(state.settings.goalSettings || DEFAULT_GOAL_SETTINGS);
      const ids = collectGoalCascadeIds(goalSettings.goals, id);
      await this.deleteGoalsByIds(ids);
      return ids.length;
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
        const next = {
          ...template,
          id: template.id || getGoalTemplateId(template.goalId, template.coreBlockId, template.variantId || 'default'),
          updatedAt: nowIso(),
          createdAt: template.createdAt || nowIso(),
        };
        const goal = draft.goalSettings.goals.find((item) => item.id === next.goalId) || null;
        const coreBlock = getCoreBlockById(draft as any, next.coreBlockId);
        draft.goalSettings = upsertGoalTemplateInSettings(draft.goalSettings, compactGoalTemplateForStorage(next, { coreBlock, goal }));
      });
    } catch (error) {
      devError('[GoalUseCase] upsertGoalTemplate failed:', error);
      throw error;
    }
  }

  async upsertGoalTemplateDraft(input: UpsertGoalTemplateInput): Promise<void> {
    const timestamp = nowIso();
    await this.upsertGoalTemplate({
      id: getGoalTemplateId(input.goalId, input.coreBlockId, input.templateVariantId || 'default'),
      goalId: input.goalId,
      coreBlockId: input.coreBlockId,
      variantId: input.templateVariantId || 'default',
      name: input.templateName || (input.templateVariantId === 'default' || !input.templateVariantId ? '记录预设' : input.templateVariantId),
      description: input.description,
      sortOrder: input.sortOrder,
      enabled: input.enabled !== false,
      targetFile: input.targetFile?.trim() || undefined,
      appendUnderHeader: input.appendUnderHeader?.trim() || undefined,
      fields: input.fields,
      defaultValues: input.defaultValues || {},
      requiredFields: input.requiredFields || [],
      periodPolicy: input.periodPolicy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async deleteGoalTemplate(goalId: string, coreBlockId: string, templateVariantId = 'default'): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        draft.goalSettings = removeGoalTemplateFromSettings(draft.goalSettings, goalId, coreBlockId, templateVariantId);
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
