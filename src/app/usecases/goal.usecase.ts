/**
 * GoalUseCase - 目标中心相关用例
 *
 * 目标：把 GoalSettings 的写操作收敛到 UseCase 层，避免 UI 直接改 settings。
 * MVP5 覆盖：目标 CRUD、周期 CRUD、目标 × Block 记录预设；不再在插件内提供迁移/写回能力。
 */

import type {
  CycleDefinition,
  CycleGranularity,
  GoalDefinition,
  GoalMetricContract,
  GoalSettings,
  GoalTemplate,
  PeriodPolicy,
  TemplateField,
} from '@core/public';
import {
  DEFAULT_GOAL_SETTINGS,
  getGoalTemplateId,
  upsertGoalTemplateInSettings,
  removeGoalTemplateFromSettings,
  removeGoalTemplatesForGoal,
  compactGoalTemplateForStorage,
  cleanupGoalTemplateStorage,
  getCoreBlockById,
  devError,
  makeStableGoalIdFromPath,
  splitGoalPath,
} from '@core/public';
import type { AppStoreApi } from './index';

export interface AddGoalInput {
  title: string;
  goalPath?: string;
  description?: string;
  themePath?: string | null;
  status?: GoalDefinition['status'];
  /** @deprecated 目标不再绑定周期；保留入参只为兼容旧调用，创建时会忽略。 */
  granularity?: GoalDefinition['granularity'];
}

export interface AddCycleInput {
  goalId: string;
  title: string;
  granularity?: CycleGranularity;
  startDate: string;
  endDate: string;
  status?: CycleDefinition['status'];
}

export interface UpsertGoalTemplateInput {
  goalId: string;
  coreBlockId: string;
  templateVariantId?: string;
  templateName?: string;
  description?: string;
  /** @deprecated 不再使用默认预设语义；保留入参只为兼容旧调用。 */
  isDefault?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  targetFile?: string;
  appendUnderHeader?: string;
  outputTemplate?: string;
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
    cycles: [...(settings?.cycles || [])],
    goalBlockBindings: [...(settings?.goalBlockBindings || [])],
    goalRecordRelations: [...(settings?.goalRecordRelations || [])],
  };
}

function normalizeGoalInput(input: AddGoalInput): GoalDefinition {
  const goalPath = splitGoalPath(input.goalPath || input.title).goalPath || input.title.trim();
  const title = input.title.trim() || goalPath.split('/').filter(Boolean).pop() || goalPath;
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

function safeCycleId(input: AddCycleInput): string {
  return `cycle.${input.goalId}.${input.startDate}.${input.endDate}`.replace(/[^a-z0-9_.-]/gi, '-');
}

function normalizeStoredGoalPath(goal: Pick<GoalDefinition, 'goalPath' | 'title'>): string {
  return splitGoalPath(goal.goalPath || goal.title).goalPath || String(goal.goalPath || goal.title || '').trim();
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
        const exists = draft.goalSettings.goals.some((item) => item.id === goal.id || splitGoalPath(item.goalPath || item.title).goalPath === goal.goalPath);
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
      // Goal 本身不再拥有周期粒度；周期只属于 plan/review Template Variant 的 periodPolicy。
      delete safePatch.granularity;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const target = draft.goalSettings.goals.find((goal) => goal.id === id);
        if (!target) return;
        Object.assign(target, safePatch, { updatedAt: nowIso() });
        if (safePatch.goalPath || safePatch.title) {
          target.goalPath = splitGoalPath(target.goalPath || target.title).goalPath || target.goalPath;
        }
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
      draft.goalSettings.cycles = draft.goalSettings.cycles.filter((cycle) => !targetIds.has(cycle.goalId));
      for (const targetId of targetIds) {
        draft.goalSettings = removeGoalTemplatesForGoal(draft.goalSettings, targetId);
      }
      draft.goalSettings.goalRecordRelations = draft.goalSettings.goalRecordRelations.filter((relation) => !targetIds.has(relation.goalId));
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

  async cleanupGoalSettingsStorage(): Promise<{
    beforeTemplateCount: number;
    afterTemplateCount: number;
    removedDuplicateTemplates: number;
    removedDanglingCycles: number;
    removedDanglingRelations: number;
    changed: boolean;
  }> {
    try {
      const state = this.store.getState();
      const fallback = {
        beforeTemplateCount: 0,
        afterTemplateCount: 0,
        removedDuplicateTemplates: 0,
        removedDanglingCycles: 0,
        removedDanglingRelations: 0,
        changed: false,
      };
      if (!state.isInitialized) return fallback;

      let summary = fallback;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const beforeCycles = draft.goalSettings.cycles.length;
        const beforeRelations = draft.goalSettings.goalRecordRelations.length;
        const liveGoalIds = new Set(draft.goalSettings.goals.map((goal) => goal.id));

        const cleaned = cleanupGoalTemplateStorage(draft.goalSettings);
        draft.goalSettings = cleaned.goalSettings;
        draft.goalSettings.cycles = draft.goalSettings.cycles.filter((cycle) => liveGoalIds.has(cycle.goalId));
        draft.goalSettings.goalRecordRelations = draft.goalSettings.goalRecordRelations.filter((relation) => liveGoalIds.has(relation.goalId));

        const removedDanglingCycles = beforeCycles - draft.goalSettings.cycles.length;
        const removedDanglingRelations = beforeRelations - draft.goalSettings.goalRecordRelations.length;
        summary = {
          beforeTemplateCount: cleaned.summary.beforeCount,
          afterTemplateCount: cleaned.summary.afterCount,
          removedDuplicateTemplates: cleaned.summary.removedDuplicateCount,
          removedDanglingCycles,
          removedDanglingRelations,
          changed: cleaned.summary.changed || removedDanglingCycles > 0 || removedDanglingRelations > 0,
        };
      });
      return summary;
    } catch (error) {
      devError('[GoalUseCase] cleanupGoalSettingsStorage failed:', error);
      throw error;
    }
  }

  async addCycle(input: AddCycleInput): Promise<CycleDefinition | null> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized || !input.goalId || !input.title.trim()) return null;
      const timestamp = nowIso();
      const cycle: CycleDefinition = {
        id: safeCycleId(input),
        goalId: input.goalId,
        title: input.title.trim(),
        granularity: input.granularity || 'custom',
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status || 'planned',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const index = draft.goalSettings.cycles.findIndex((item) => item.id === cycle.id);
        if (index >= 0) draft.goalSettings.cycles[index] = { ...draft.goalSettings.cycles[index], ...cycle, updatedAt: timestamp };
        else draft.goalSettings.cycles.push(cycle);
      });
      return cycle;
    } catch (error) {
      devError('[GoalUseCase] addCycle failed:', error);
      throw error;
    }
  }

  async updateCycle(id: string, patch: Partial<CycleDefinition>): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const target = draft.goalSettings.cycles.find((cycle) => cycle.id === id);
        if (!target) return;
        Object.assign(target, patch, { updatedAt: nowIso() });
      });
    } catch (error) {
      devError('[GoalUseCase] updateCycle failed:', error);
      throw error;
    }
  }

  async closeCycle(id: string): Promise<void> {
    await this.updateCycle(id, { status: 'closed' });
  }

  async reopenCycle(id: string): Promise<void> {
    await this.updateCycle(id, { status: 'active' });
  }

  async markCycleReviewing(id: string): Promise<void> {
    await this.updateCycle(id, { status: 'reviewing' });
  }

  async deleteCycle(id: string): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        draft.goalSettings.cycles = draft.goalSettings.cycles.filter((cycle) => cycle.id !== id);
        draft.goalSettings.goalRecordRelations = draft.goalSettings.goalRecordRelations.map((relation) => relation.cycleId === id ? { ...relation, cycleId: null } : relation);
      });
    } catch (error) {
      devError('[GoalUseCase] deleteCycle failed:', error);
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
      isDefault: undefined,
      sortOrder: input.sortOrder,
      enabled: input.enabled !== false,
      targetFile: input.targetFile?.trim() || undefined,
      appendUnderHeader: input.appendUnderHeader?.trim() || undefined,
      outputTemplate: input.outputTemplate?.trim() || undefined,
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


  /** @deprecated Use upsertGoalTemplate. Kept for old UI/plugin data compatibility. */
  async upsertGoalBlockBinding(binding: GoalTemplate): Promise<void> {
    return this.upsertGoalTemplate(binding);
  }

  /** @deprecated Use upsertGoalTemplateDraft. Kept for old UI/plugin data compatibility. */
  async upsertGoalBlockBindingDraft(input: UpsertGoalTemplateInput): Promise<void> {
    return this.upsertGoalTemplateDraft(input);
  }

  /** @deprecated Use deleteGoalTemplate. Kept for old UI/plugin data compatibility. */
  async deleteGoalBlockBinding(goalId: string, coreBlockId: string, templateVariantId = 'default'): Promise<void> {
    return this.deleteGoalTemplate(goalId, coreBlockId, templateVariantId);
  }



}

export function createGoalUseCase(store: AppStoreApi): GoalUseCase {
  return new GoalUseCase(store);
}
