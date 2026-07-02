import type { TemplateField } from '@/core/types/schema';
import type { GoalTemplateStorageRow, GoalDefinition, GoalId, GoalSettings, PeriodPolicy } from './types';
import { getGoalPathCandidates, splitGoalPath } from './path';
import { isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity } from './period';
import { DEFAULT_TEMPLATE_VARIANT_ID, normalizeTemplateVariantId } from './templateVariant';

/**
 * GoalTemplate 是新主链正式业务接口：某个目标 + 某个固定 Block 的模板策略。
 *
 * P5 收敛：
 * - GoalTemplate 不是 Block 本身；Block 是固定记录动作，Template 是该动作的输出策略；
 * - 新主链不是 Theme x Block，而是 Goal x Block；
 * - 一个 Goal x Block 单元允许多个 template variant，例如“健康目标 + 打卡”下可以有“运动打卡 / 饮水打卡 / 睡眠打卡”。
 */
export interface GoalTemplate {
  id: string;
  goalId: GoalId;
  coreBlockId: string;
  /** 一个 Goal + Block 下的模板变体 ID。 */
  variantId?: string;
  /** 面向 UI 显示的模板名称，例如：运动打卡、饮水打卡。 */
  name?: string;
  description?: string;
  /** 只有计划 / 总结类记录预设才启用周期；非周期 Block 必须为空。 */
  periodPolicy?: PeriodPolicy;
  /** 同一个 Goal + Block 下的模板变体排序。数值越小越靠前。 */
  sortOrder?: number;
  enabled: boolean;
  fields?: TemplateField[];
  outputTemplate?: string;
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
  createdAt?: string;
  updatedAt?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeVariantId(value?: string | null): string {
  return normalizeTemplateVariantId(value);
}

function safeIdPart(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-') || 'default';
}

function parseVariantIdFromTemplateId(id?: string | null): string {
  const text = String(id || '').trim();
  if (!text.startsWith('goal-template.')) return DEFAULT_TEMPLATE_VARIANT_ID;
  const parts = text.split('.');
  // base id: goal-template.<goalId>.<coreBlockId>
  // variant id: goal-template.<goalId>.<coreBlockId>.<variantId>
  if (parts.length <= 4) return DEFAULT_TEMPLATE_VARIANT_ID;
  return normalizeVariantId(parts.slice(4).join('.'));
}

function normalizeGoalTemplateId(goalId: string, coreBlockId: string, variantId?: string | null, id?: string | null): string {
  const text = String(id || '').trim();
  const normalizedVariantId = normalizeVariantId(variantId);
  if (text && text.startsWith('goal-template.')) {
    const idVariantId = parseVariantIdFromTemplateId(text);
    // 如果 id 和 variantId 不一致，按当前 variantId 重建稳定 id，
    // 避免不同预设在 UI / 拖拽 / 删除时共享同一个 key。
    if (idVariantId === normalizedVariantId) return text;
    if (normalizedVariantId === DEFAULT_TEMPLATE_VARIANT_ID && idVariantId === DEFAULT_TEMPLATE_VARIANT_ID) return text;
  }
  return getGoalTemplateId(goalId, coreBlockId, normalizedVariantId);
}

function normalizeTemplatePeriodPolicy(coreBlockId: string, raw: any): PeriodPolicy | undefined {
  if (!isPeriodAwareCoreBlock(coreBlockId)) return undefined;
  const policy = raw?.periodPolicy;
  if (policy && policy.enabled !== false) {
    return { enabled: true, granularity: normalizePeriodPolicyGranularity(policy.granularity) };
  }
  return { enabled: true, granularity: 'week' };
}

/** Normalize the persisted GoalTemplate row into the domain-facing GoalTemplate interface. */
export function normalizeGoalTemplateStorageRow(row: GoalTemplateStorageRow): GoalTemplate {
  const variantId = normalizeVariantId(row.variantId || parseVariantIdFromTemplateId(row.id));
  return {
    id: normalizeGoalTemplateId(row.goalId, row.coreBlockId, variantId, row.id),
    goalId: row.goalId,
    coreBlockId: row.coreBlockId,
    variantId,
    name: row.name || (variantId === DEFAULT_TEMPLATE_VARIANT_ID ? '记录预设' : variantId),
    description: row.description,
    periodPolicy: normalizeTemplatePeriodPolicy(row.coreBlockId, row),
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
    enabled: row.enabled !== false,
    fields: row.fields,
    outputTemplate: row.outputTemplate,
    targetFile: row.targetFile,
    appendUnderHeader: row.appendUnderHeader,
    defaultValues: row.defaultValues || {},
    requiredFields: row.requiredFields || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Convert the domain-facing GoalTemplate back to the persisted storage row. */
export function toGoalTemplateStorageRow(template: GoalTemplate, previous?: GoalTemplateStorageRow | null): GoalTemplateStorageRow {
  const timestamp = nowIso();
  const variantId = normalizeVariantId(template.variantId);
  return {
    ...(previous || {}),
    id: normalizeGoalTemplateId(template.goalId, template.coreBlockId, variantId, template.id),
    goalId: template.goalId,
    coreBlockId: template.coreBlockId,
    variantId,
    name: template.name || (variantId === DEFAULT_TEMPLATE_VARIANT_ID ? '记录预设' : variantId),
    description: template.description,
    periodPolicy: normalizeTemplatePeriodPolicy(template.coreBlockId, template),
    sortOrder: template.sortOrder,
    enabled: template.enabled !== false,
    fields: template.fields?.length ? template.fields : undefined,
    outputTemplate: template.outputTemplate || undefined,
    targetFile: template.targetFile || undefined,
    appendUnderHeader: template.appendUnderHeader || undefined,
    defaultValues: template.defaultValues && Object.keys(template.defaultValues).length ? template.defaultValues : undefined,
    requiredFields: template.requiredFields?.length ? template.requiredFields : undefined,
    createdAt: template.createdAt || previous?.createdAt || timestamp,
    updatedAt: template.updatedAt || timestamp,
  };
}

function goalTemplateIdentityKey(template: Pick<GoalTemplate, 'goalId' | 'coreBlockId' | 'variantId'>): string {
  return `${template.goalId}::${template.coreBlockId}::${normalizeVariantId(template.variantId)}`;
}

export function getGoalTemplates(goalSettings?: Pick<GoalSettings, 'goalTemplates'> | null): GoalTemplate[] {
  const result: GoalTemplate[] = [];
  const indexByKey = new Map<string, number>();
  for (const row of goalSettings?.goalTemplates || []) {
    const template = normalizeGoalTemplateStorageRow(row);
    const key = goalTemplateIdentityKey(template);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length);
      result.push(template);
    } else {
      // 同一个 Goal × 记录类型 × variant 只保留最后一次存储结果，
      // 但保留首次出现的位置，避免清理重复项导致 UI 顺序跳变。
      result[existingIndex] = template;
    }
  }
  return result;
}

export function getGoalTemplateId(goalId: string, coreBlockId: string, variantId: string = 'default'): string {
  const normalizedVariantId = normalizeVariantId(variantId);
  const base = `goal-template.${safeIdPart(goalId)}.${safeIdPart(coreBlockId)}`;
  return normalizedVariantId === DEFAULT_TEMPLATE_VARIANT_ID ? base : `${base}.${safeIdPart(normalizedVariantId)}`;
}


export function getGoalTemplateCandidateGoalIds(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null): string[] {
  if (!goal) return [];
  const goals = goalSettings?.goals || [];
  const ids: string[] = [goal.id];
  const path = splitGoalPath(goal.goalPath || goal.title).goalPath;
  const byPath = new Map(goals.map((item) => [splitGoalPath(item.goalPath || item.title).goalPath, item]));
  for (const parentPath of getGoalPathCandidates(path).slice(1)) {
    const parentGoal = byPath.get(parentPath);
    if (parentGoal && !ids.includes(parentGoal.id)) ids.push(parentGoal.id);
  }
  return ids;
}

export function getGoalTemplateVariants(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null, coreBlockId: string): GoalTemplate[] {
  const candidateGoalIds = getGoalTemplateCandidateGoalIds(goalSettings, goal);
  if (!candidateGoalIds.length) return [];
  const rank = new Map(candidateGoalIds.map((id, index) => [id, index]));
  return getGoalTemplates(goalSettings)
    .map((template, storageIndex) => ({ template, storageIndex }))
    .filter(({ template }) => template.enabled !== false && candidateGoalIds.includes(template.goalId) && template.coreBlockId === coreBlockId)
    .sort((a, b) => {
      const byGoal = (rank.get(a.template.goalId) ?? 999) - (rank.get(b.template.goalId) ?? 999);
      if (byGoal !== 0) return byGoal;
      const bySortOrder = (a.template.sortOrder ?? 9999) - (b.template.sortOrder ?? 9999);
      if (bySortOrder !== 0) return bySortOrder;
      return a.storageIndex - b.storageIndex;
    })
    .map(({ template }) => template);
}

export function findGoalTemplate(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null, coreBlockId: string, variantId?: string | null): GoalTemplate | null {
  const variants = getGoalTemplateVariants(goalSettings, goal, coreBlockId);
  if (!variants.length) return null;
  const normalizedVariantId = normalizeVariantId(variantId);
  if (variantId) {
    const exact = variants.find((template) => normalizeVariantId(template.variantId) === normalizedVariantId || template.id === variantId);
    if (exact) return exact;
  }
  return variants[0] || null;
}

/** Storage helper: centralizes GoalTemplate upsert semantics for GoalSettings. */
export function upsertGoalTemplateInSettings(goalSettings: GoalSettings, template: GoalTemplate): GoalSettings {
  const previousRows = goalSettings.goalTemplates || [];
  const variantId = normalizeVariantId(template.variantId);
  const nextTemplate = { ...template, variantId, id: template.id || getGoalTemplateId(template.goalId, template.coreBlockId, variantId) };
  const rows = previousRows.slice();
  const index = rows.findIndex((item: any) => {
    const itemVariantId = normalizeVariantId(item.variantId || parseVariantIdFromTemplateId(item.id));
    return item.id === nextTemplate.id || (item.goalId === nextTemplate.goalId && item.coreBlockId === nextTemplate.coreBlockId && itemVariantId === variantId);
  });
  const next = toGoalTemplateStorageRow(nextTemplate, index >= 0 ? rows[index] : null);

  const normalizedRows = rows.slice();
  if (index >= 0) normalizedRows[index] = next;
  else normalizedRows.push(next);
  return { ...goalSettings, goalTemplates: normalizedRows };
}

/** Storage helper: removes a GoalTemplate from GoalSettings. */
export function removeGoalTemplateFromSettings(goalSettings: GoalSettings, goalId: string, coreBlockId: string, variantId: string = 'default'): GoalSettings {
  const normalizedVariantId = normalizeVariantId(variantId);
  return {
    ...goalSettings,
    goalTemplates: (goalSettings.goalTemplates || []).filter((template: any) => {
      const itemVariantId = normalizeVariantId(template.variantId || parseVariantIdFromTemplateId(template.id));
      return !(template.goalId === goalId && template.coreBlockId === coreBlockId && itemVariantId === normalizedVariantId);
    }),
  };
}

export function removeGoalTemplatesForGoal(goalSettings: GoalSettings, goalId: string): GoalSettings {
  return {
    ...goalSettings,
    goalTemplates: (goalSettings.goalTemplates || []).filter((template) => template.goalId !== goalId),
  };
}

export interface GoalTemplateStorageCleanupSummary {
  beforeCount: number;
  afterCount: number;
  removedDuplicateCount: number;
  changed: boolean;
}

/**
 * Normalize persisted GoalTemplate rows without changing the business source of truth.
 *
 * Effects:
 * - dedupe duplicate rows by Goal × 记录类型 × variant;
 * - rebuild ids from normalized variantId;
 * - keep the first storage position for each identity and the latest row content.
 */
export function cleanupGoalTemplateStorage(goalSettings: GoalSettings): { goalSettings: GoalSettings; summary: GoalTemplateStorageCleanupSummary } {
  const beforeRows = goalSettings.goalTemplates || [];
  const templates = getGoalTemplates(goalSettings);
  const afterRows = templates.map((template) => toGoalTemplateStorageRow(template));
  const beforeJson = JSON.stringify(beforeRows);
  const afterJson = JSON.stringify(afterRows);
  return {
    goalSettings: { ...goalSettings, goalTemplates: afterRows },
    summary: {
      beforeCount: beforeRows.length,
      afterCount: afterRows.length,
      removedDuplicateCount: Math.max(0, beforeRows.length - afterRows.length),
      changed: beforeJson !== afterJson,
    },
  };
}
