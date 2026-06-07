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
  GoalDefinition,
  GoalMetricContract,
  GoalMigrationCandidate,
  GoalSettings,
  GoalTemplate,
  TemplateField,
} from '@core/public';
import {
  DEFAULT_GOAL_SETTINGS,
  buildGoalDefinitionFromThemeMigration,
  buildGoalTemplateFromThemeMigration,
  buildThemeOverrideGoalMigrationPlan,
  buildLegacyOverrideTemplateTargets,
  buildThemeOverrideRecordMigrationPreview,
  getGoalTemplateId,
  upsertGoalTemplateInSettings,
  removeGoalTemplateFromSettings,
  removeGoalTemplatesForGoal,
  buildGoalMarkdownBackfillPreview,
  buildGoalMarkdownBackfillDiffPreview,
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
  isDefault?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  targetFile?: string;
  appendUnderHeader?: string;
  outputTemplate?: string;
  fields?: TemplateField[];
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
    granularity: input.granularity || 'day',
    metrics: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function safeCycleId(input: AddCycleInput): string {
  return `cycle.${input.goalId}.${input.startDate}.${input.endDate}`.replace(/[^a-z0-9_.-]/gi, '-');
}


export interface ApplyThemeOverrideGoalMigrationOptions {
  includeDisabled?: boolean;
  clearLegacyOverrides?: boolean;
  /** 迁移 UI 中的主题 -> 目标归类。key 支持完整主题路径、父级主题路径或 themeId。 */
  themeGoalMap?: Record<string, string>;
}

export interface ApplyThemeOverrideGoalMigrationResult {
  createdGoals: number;
  createdTemplates: number;
  clearedLegacyOverrides: number;
}

export interface ApplyThemeOverrideRecordMigrationResult {
  updated: number;
  failed: number;
  skipped: number;
  taskInlineUpdated: number;
  blockMetadataUpdated: number;
  unresolved: number;
}

export interface CreateGoalMigrationBackupResult {
  backupRoot: string;
  settingsPath: string;
  markdownFileCount: number;
  failedPaths: string[];
}

export interface CleanupLegacyThemeOverridesResult {
  removedOverrides: number;
  remainingThemes: number;
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
        draft.goalSettings = removeGoalTemplatesForGoal(draft.goalSettings, id);
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
        draft.goalSettings = upsertGoalTemplateInSettings(draft.goalSettings, next);
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
      name: input.templateName || (input.templateVariantId === 'default' || !input.templateVariantId ? '默认模板' : input.templateVariantId),
      description: input.description,
      isDefault: input.isDefault !== false && (!input.templateVariantId || input.templateVariantId === 'default' || input.isDefault === true),
      sortOrder: input.sortOrder,
      enabled: input.enabled !== false,
      targetFile: input.targetFile?.trim() || undefined,
      appendUnderHeader: input.appendUnderHeader?.trim() || undefined,
      outputTemplate: input.outputTemplate?.trim() || undefined,
      fields: input.fields,
      defaultValues: input.defaultValues || {},
      requiredFields: input.requiredFields || [],
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



  async createGoalMigrationBackup(): Promise<CreateGoalMigrationBackupResult> {
    try {
      if (!this.itemService) {
        throw new Error('ItemService 不可用，无法创建迁移备份。');
      }
      const state = this.store.getState();
      if (!state.isInitialized) {
        return { backupRoot: '', settingsPath: '', markdownFileCount: 0, failedPaths: [] };
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupRoot = `ThinkOS/Backups/goal-migration-${stamp}`;
      return await this.itemService.createMigrationBackup(backupRoot, state.settings);
    } catch (error) {
      devError('[GoalUseCase] createGoalMigrationBackup failed:', error);
      throw error;
    }
  }

  previewThemeOverrideGoalMigration(options: ApplyThemeOverrideGoalMigrationOptions = {}) {
    const state = this.store.getState();
    return buildThemeOverrideGoalMigrationPlan(state.settings, this.dataStore.queryItems(), {
      includeDisabled: options.includeDisabled !== false,
      themeGoalMap: options.themeGoalMap || {},
      fallbackThemeAsGoal: false,
    });
  }

  async applyThemeOverrideGoalMigration(options: ApplyThemeOverrideGoalMigrationOptions = {}): Promise<ApplyThemeOverrideGoalMigrationResult> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return { createdGoals: 0, createdTemplates: 0, clearedLegacyOverrides: 0 };
      const includeDisabled = options.includeDisabled !== false;
      const clearLegacyOverrides = options.clearLegacyOverrides !== false;
      const plan = buildThemeOverrideGoalMigrationPlan(state.settings, this.dataStore.queryItems(), {
        includeDisabled,
        themeGoalMap: options.themeGoalMap || {},
        fallbackThemeAsGoal: false,
      });
      let createdGoals = 0;
      let createdTemplates = 0;
      let clearedLegacyOverrides = 0;

      await state.updateSettings((draft) => {
        draft.goalSettings = ensureGoalSettings(draft.goalSettings || DEFAULT_GOAL_SETTINGS);
        const goalsByPath = new Map(draft.goalSettings.goals.map((goal) => [splitGoalPath(goal.goalPath || goal.title).goalPath || goal.id, goal]));
        const existingTemplateIds = new Set((draft.goalSettings.goalBlockBindings || []).map((template) => template.id));

        const cellCounts = new Map<string, number>();
        const cellHasDefault = new Set<string>();
        for (const candidate of plan.candidates) {
          const existingGoal = goalsByPath.get(candidate.goalPath);
          if (!existingGoal) {
            const goal = buildGoalDefinitionFromThemeMigration(candidate, null);
            draft.goalSettings.goals.push(goal);
            goalsByPath.set(candidate.goalPath, goal);
            createdGoals += 1;
          }
          const cellKey = `${candidate.goalId}::${candidate.coreBlockId}`;
          const cellIndex = cellCounts.get(cellKey) || 0;
          cellCounts.set(cellKey, cellIndex + 1);
          const shouldBeDefault = candidate.enabled && !cellHasDefault.has(cellKey);
          if (shouldBeDefault) cellHasDefault.add(cellKey);
          const template = {
            ...buildGoalTemplateFromThemeMigration(candidate),
            isDefault: shouldBeDefault,
            sortOrder: cellIndex * 10,
          };
          if (!existingTemplateIds.has(template.id)) createdTemplates += 1;
          draft.goalSettings = upsertGoalTemplateInSettings(draft.goalSettings, template);
          existingTemplateIds.add(template.id);
        }

        if (clearLegacyOverrides && draft.inputSettings?.overrides) {
          const migratedOverrideIds = new Set(plan.candidates.map((candidate) => candidate.overrideId));
          const before = draft.inputSettings.overrides.length;
          draft.inputSettings.overrides = draft.inputSettings.overrides.filter((override) => !migratedOverrideIds.has(override.id));
          clearedLegacyOverrides = before - draft.inputSettings.overrides.length;
        } else if (draft.inputSettings?.overrides) {
          const migratedOverrideIds = new Set(plan.candidates.map((candidate) => candidate.overrideId));
          draft.inputSettings.overrides = draft.inputSettings.overrides.map((override) => migratedOverrideIds.has(override.id) ? { ...override, disabled: true } : override);
        }
      });

      return { createdGoals, createdTemplates, clearedLegacyOverrides };
    } catch (error) {
      devError('[GoalUseCase] applyThemeOverrideGoalMigration failed:', error);
      throw error;
    }
  }

  previewThemeOverrideRecordMigration(limit = 20) {
    const state = this.store.getState();
    return buildThemeOverrideRecordMigrationPreview(state.settings, this.dataStore.queryItems(), limit);
  }

  async applyThemeOverrideRecordMigration(_limit = 500): Promise<ApplyThemeOverrideRecordMigrationResult> {
    const emptyResult: ApplyThemeOverrideRecordMigrationResult = {
      updated: 0,
      failed: 0,
      skipped: 0,
      taskInlineUpdated: 0,
      blockMetadataUpdated: 0,
      unresolved: 0,
    };
    try {
      if (!this.itemService) return emptyResult;
      const state = this.store.getState();
      if (!state.isInitialized) return emptyResult;
      const byOverrideId = new Map<string, any>(Object.entries(buildLegacyOverrideTemplateTargets(state.settings)));
      // 如果用户还没清理旧 overrides，也允许从当前迁移计划中补充映射。
      const plan = buildThemeOverrideGoalMigrationPlan(state.settings, this.dataStore.queryItems(), {
        includeDisabled: true,
        fallbackThemeAsGoal: false,
      });
      for (const candidate of plan.candidates) {
        if (!byOverrideId.has(candidate.overrideId)) byOverrideId.set(candidate.overrideId, candidate);
      }
      const legacyItems = this.dataStore.queryItems().filter((item: any) => {
        const source = String(item.templateSourceType || item.extra?.['模板来源'] || '').trim();
        const templateId = String(item.templateId || item.extra?.['模板ID'] || '').trim();
        return source === 'override' || /^ovr_/.test(templateId);
      });
      const items = legacyItems.filter((item: any) => {
        const templateId = String(item.templateId || item.extra?.['模板ID'] || '').trim();
        return templateId && byOverrideId.has(templateId);
      }).slice(0, Math.max(1, _limit));
      let updated = 0;
      let failed = 0;
      let skipped = Math.max(0, legacyItems.length - items.length);
      let taskInlineUpdated = 0;
      let blockMetadataUpdated = 0;
      const unresolved = legacyItems.filter((item: any) => {
        const templateId = String(item.templateId || item.extra?.['模板ID'] || '').trim();
        return !templateId || !byOverrideId.has(templateId);
      }).length;
      for (const item of items as any[]) {
        const oldTemplateId = String(item.templateId || item.extra?.['模板ID'] || '').trim();
        const candidate = byOverrideId.get(oldTemplateId);
        if (!candidate) {
          skipped += 1;
          continue;
        }
        try {
          const fields: Record<string, string> = {
            '模板来源': 'goal-template',
            '模板ID': candidate.templateId,
            '目标ID': candidate.goalId,
            '目标': candidate.goalPath,
            '核心Block': candidate.coreBlockId,
          };
          if (candidate.themePath) fields['主题'] = candidate.themePath;
          const result = await this.itemService.upsertItemGoalTemplateMigrationFields(item.id, fields, { autoRefresh: false });
          if (result.shape === 'block-metadata') blockMetadataUpdated += 1;
          else taskInlineUpdated += 1;
          updated += 1;
        } catch (error) {
          failed += 1;
          devError('[GoalUseCase] applyThemeOverrideRecordMigration item failed:', error);
        }
      }
      if (updated > 0) {
        await this.dataStore.clearCacheAndRescan('warm');
      }
      return { updated, failed, skipped, taskInlineUpdated, blockMetadataUpdated, unresolved };
    } catch (error) {
      devError('[GoalUseCase] applyThemeOverrideRecordMigration failed:', error);
      throw error;
    }
  }

  async cleanupLegacyThemeOverrides(): Promise<CleanupLegacyThemeOverridesResult> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return { removedOverrides: 0, remainingThemes: 0 };
      let removedOverrides = 0;
      let remainingThemes = 0;
      await state.updateSettings((draft) => {
        const overrides = draft.inputSettings?.overrides || [];
        removedOverrides = overrides.length;
        if (draft.inputSettings) {
          draft.inputSettings.overrides = [];
          remainingThemes = draft.inputSettings.themes?.length || 0;
        }
      });
      return { removedOverrides, remainingThemes };
    } catch (error) {
      devError('[GoalUseCase] cleanupLegacyThemeOverrides failed:', error);
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

  async applyMarkdownGoalBackfill(_limit = 200): Promise<{ updated: number; failed: number; paths: string[] }> {
    // MVP8 收敛：Markdown 迁移只做候选/补齐建议，不再提供批量写回，避免数据安全风险。
    return { updated: 0, failed: 0, paths: [] };
  }

  async applyLegacyGoalMigration(candidates?: GoalMigrationCandidate[]): Promise<{ createdGoals: number; relationCount: number }> {
    try {
      const state = this.store.getState();
      if (!state.isInitialized) return { createdGoals: 0, relationCount: 0 };
      const sourceItems = this.dataStore.queryItems();
      const preview = candidates || inferGoalCandidatesFromItems(sourceItems, state.settings.goalSettings?.goals || []);
      let createdGoals = 0;

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
            themePath: null,
            granularity: 'day',
            metrics: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          draft.goalSettings.goals.push(goal);
          goalsByPath.set(path, goal);
          createdGoals += 1;
        }
      });

      // MVP8 收敛：目标-记录关系不再持久化；视图运行时从记录字段推导。
      return { createdGoals, relationCount: 0 };
    } catch (error) {
      devError('[GoalUseCase] applyLegacyGoalMigration failed:', error);
      throw error;
    }
  }
}

export function createGoalUseCase(store: AppStoreApi, deps: { dataStore: DataStore; itemService?: ItemService }): GoalUseCase {
  return new GoalUseCase(store, deps.dataStore, deps.itemService);
}
