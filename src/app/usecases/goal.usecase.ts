/**
 * GoalUseCase - 目标中心相关用例
 *
 * 目标：把 GoalSettings 的写操作收敛到 UseCase 层，避免 UI 直接改 settings。
 * MVP3 覆盖：目标 CRUD、周期 CRUD、目标-核心Block 绑定、旧 goalPaths 预览/应用迁移。
 */

import type {
  CycleDefinition,
  CycleGranularity,
  DataStore,
  ItemService,
  GoalBlockBinding,
  GoalDefinition,
  GoalMetricContract,
  GoalMigrationCandidate,
  GoalSettings,
} from '@core/public';
import {
  DEFAULT_GOAL_SETTINGS,
  buildGoalMarkdownBackfillPreview,
  buildGoalMarkdownBackfillDiffPreview,
  buildGoalRelationsFromItems,
  devError,
  inferGoalCandidatesFromItems,
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
}

export interface AddCycleInput {
  goalId: string;
  title: string;
  granularity?: CycleGranularity;
  startDate: string;
  endDate: string;
  status?: CycleDefinition['status'];
}

export interface UpsertGoalBlockBindingInput {
  goalId: string;
  coreBlockId: string;
  enabled?: boolean;
  targetFile?: string;
  appendUnderHeader?: string;
  outputTemplate?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
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

export class GoalUseCase {
  constructor(private store: AppStoreApi, private dataStore: DataStore, private itemService?: ItemService) {}

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
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const target = draft.goalSettings.goals.find((goal) => goal.id === id);
        if (!target) return;
        Object.assign(target, patch, { updatedAt: nowIso() });
        if (patch.goalPath || patch.title) {
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

  async deleteGoal(id: string): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        draft.goalSettings.goals = draft.goalSettings.goals.filter((goal) => goal.id !== id);
        draft.goalSettings.cycles = draft.goalSettings.cycles.filter((cycle) => cycle.goalId !== id);
        draft.goalSettings.goalBlockBindings = draft.goalSettings.goalBlockBindings.filter((binding) => binding.goalId !== id);
        draft.goalSettings.goalRecordRelations = draft.goalSettings.goalRecordRelations.filter((relation) => relation.goalId !== id);
      });
    } catch (error) {
      devError('[GoalUseCase] deleteGoal failed:', error);
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

  async upsertGoalBlockBinding(binding: GoalBlockBinding): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const index = draft.goalSettings.goalBlockBindings.findIndex((item) => item.id === binding.id || (item.goalId === binding.goalId && item.coreBlockId === binding.coreBlockId));
        const next = {
          ...binding,
          id: binding.id || `binding.${binding.goalId}.${binding.coreBlockId}`,
          updatedAt: nowIso(),
          createdAt: binding.createdAt || nowIso(),
        };
        if (index >= 0) draft.goalSettings.goalBlockBindings[index] = { ...draft.goalSettings.goalBlockBindings[index], ...next };
        else draft.goalSettings.goalBlockBindings.push(next);
      });
    } catch (error) {
      devError('[GoalUseCase] upsertGoalBlockBinding failed:', error);
      throw error;
    }
  }

  async upsertGoalBlockBindingDraft(input: UpsertGoalBlockBindingInput): Promise<void> {
    const timestamp = nowIso();
    await this.upsertGoalBlockBinding({
      id: `binding.${input.goalId}.${input.coreBlockId}`,
      goalId: input.goalId,
      coreBlockId: input.coreBlockId,
      enabled: input.enabled !== false,
      targetFile: input.targetFile?.trim() || undefined,
      appendUnderHeader: input.appendUnderHeader?.trim() || undefined,
      outputTemplate: input.outputTemplate?.trim() || undefined,
      defaultValues: input.defaultValues || {},
      requiredFields: input.requiredFields || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async deleteGoalBlockBinding(goalId: string, coreBlockId: string): Promise<void> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return;
      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        draft.goalSettings.goalBlockBindings = draft.goalSettings.goalBlockBindings.filter((binding) => !(binding.goalId === goalId && binding.coreBlockId === coreBlockId));
      });
    } catch (error) {
      devError('[GoalUseCase] deleteGoalBlockBinding failed:', error);
      throw error;
    }
  }

  previewLegacyGoalMigration(): GoalMigrationCandidate[] {
    const state = this.store.getState();
    const goals = state.settings.goalSettings?.goals || [];
    return inferGoalCandidatesFromItems(this.dataStore.queryItems(), goals);
  }

  previewMarkdownGoalBackfill(limit = 20) {
    const state = this.store.getState();
    return buildGoalMarkdownBackfillPreview(this.dataStore.queryItems(), state.settings.goalSettings?.goals || [], limit);
  }

  previewMarkdownGoalBackfillDiff(limit = 20) {
    const state = this.store.getState();
    return buildGoalMarkdownBackfillDiffPreview(this.dataStore.queryItems(), state.settings.goalSettings?.goals || [], limit);
  }

  async applyMarkdownGoalBackfill(limit = 200): Promise<{ updated: number; failed: number; paths: string[] }> {
    if (!this.itemService) return { updated: 0, failed: 0, paths: [] };
    const state = this.store.getState();
    const preview = buildGoalMarkdownBackfillPreview(this.dataStore.queryItems(), state.settings.goalSettings?.goals || [], limit);
    let updated = 0;
    let failed = 0;
    const paths = new Set<string>();

    for (const item of preview.items) {
      try {
        const result = await this.itemService.upsertItemInlineFields(item.itemId, item.patchFields, { autoRefresh: false });
        paths.add(result.path);
        updated += 1;
      } catch (error) {
        failed += 1;
        devError('[GoalUseCase] applyMarkdownGoalBackfill item failed:', item.itemId, error);
      }
    }

    for (const path of paths) {
      await this.dataStore.scanFileByPath(path, { bumpVersion: false });
    }
    if (paths.size > 0) this.dataStore.notifyChange();
    return { updated, failed, paths: Array.from(paths) };
  }

  async applyLegacyGoalMigration(candidates?: GoalMigrationCandidate[]): Promise<{ createdGoals: number; relationCount: number }> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return { createdGoals: 0, relationCount: 0 };
      const sourceItems = this.dataStore.queryItems();
      const preview = candidates || inferGoalCandidatesFromItems(sourceItems, state.settings.goalSettings?.goals || []);
      let createdGoals = 0;
      let relationCount = 0;

      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const goalsByPath = new Map(draft.goalSettings.goals.map((goal) => [splitGoalPath(goal.goalPath || goal.title).goalPath, goal]));
        for (const candidate of preview) {
          const path = splitGoalPath(candidate.goalPath).goalPath;
          if (!path || goalsByPath.has(path)) continue;
          const timestamp = nowIso();
          const goal: GoalDefinition = {
            id: candidate.id || makeStableGoalIdFromPath(path),
            title: candidate.title || path.split('/').filter(Boolean).pop() || path,
            goalPath: path,
            status: 'active',
            parentGoalId: null,
            themePath: candidate.themePath ?? null,
            metrics: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          draft.goalSettings.goals.push(goal);
          goalsByPath.set(path, goal);
          createdGoals += 1;
        }

        const existingRelations = new Set(draft.goalSettings.goalRecordRelations.map((relation) => `${relation.goalId}::${relation.recordId}`));
        const relations = buildGoalRelationsFromItems(sourceItems, draft.goalSettings.goals);
        for (const relation of relations) {
          const key = `${relation.goalId}::${relation.recordId}`;
          if (existingRelations.has(key)) continue;
          draft.goalSettings.goalRecordRelations.push(relation);
          existingRelations.add(key);
          relationCount += 1;
        }
      });

      return { createdGoals, relationCount };
    } catch (error) {
      devError('[GoalUseCase] applyLegacyGoalMigration failed:', error);
      throw error;
    }
  }
}

export function createGoalUseCase(store: AppStoreApi, deps: { dataStore: DataStore; itemService?: ItemService }): GoalUseCase {
  return new GoalUseCase(store, deps.dataStore, deps.itemService);
}
