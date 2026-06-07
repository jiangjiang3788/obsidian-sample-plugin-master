import type { TemplateField } from '@/core/types/schema';
import type { CycleGranularity, GoalBlockBinding, GoalDefinition, GoalId, GoalSettings } from './types';
import { splitGoalPath } from './path';

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
  /** 一个 Goal + Block 下的模板变体 ID。默认模板使用 default。 */
  variantId?: string;
  /** 面向 UI 显示的模板名称，例如：运动打卡、饮水打卡。 */
  name?: string;
  description?: string;
  /** 多个变体中，QuickInput 默认选择的模板。 */
  isDefault?: boolean;
  /** 该目标 × Block 预设的统计周期；不在目标库绑定。未设置时默认日。 */
  granularity?: Exclude<CycleGranularity, 'custom'>;
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
  const text = String(value || '').trim();
  return text || 'default';
}

function safeIdPart(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-') || 'default';
}

function parseVariantIdFromLegacyId(id?: string | null): string {
  const text = String(id || '').trim();
  if (!text.startsWith('goal-template.')) return 'default';
  const parts = text.split('.');
  // old id: goal-template.<goalId>.<coreBlockId>
  // new id: goal-template.<goalId>.<coreBlockId>.<variantId>
  if (parts.length <= 4) return 'default';
  return normalizeVariantId(parts.slice(4).join('.'));
}

function normalizeGoalTemplateId(goalId: string, coreBlockId: string, variantId?: string | null, id?: string | null): string {
  const text = String(id || '').trim();
  if (text && text.startsWith('goal-template.')) return text;
  return getGoalTemplateId(goalId, coreBlockId, variantId);
}

/** Convert legacy storage rows into the formal GoalTemplate interface. */
export function fromLegacyGoalTemplateStorage(row: GoalBlockBinding): GoalTemplate {
  const raw = row as any;
  const variantId = normalizeVariantId(raw.variantId || parseVariantIdFromLegacyId(row.id));
  return {
    id: normalizeGoalTemplateId(row.goalId, row.coreBlockId, variantId, row.id),
    goalId: row.goalId,
    coreBlockId: row.coreBlockId,
    variantId,
    name: raw.name || raw.templateName || (variantId === 'default' ? '默认模板' : variantId),
    description: raw.description,
    isDefault: raw.isDefault === true || variantId === 'default',
    granularity: raw.granularity,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : undefined,
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

/** Convert the formal GoalTemplate back to the current legacy storage shape. */
export function toLegacyGoalTemplateStorage(template: GoalTemplate, previous?: GoalBlockBinding | null): GoalBlockBinding {
  const timestamp = nowIso();
  const variantId = normalizeVariantId(template.variantId);
  return {
    ...(previous || {}),
    id: normalizeGoalTemplateId(template.goalId, template.coreBlockId, variantId, template.id),
    goalId: template.goalId,
    coreBlockId: template.coreBlockId,
    variantId,
    name: template.name || (variantId === 'default' ? '默认模板' : variantId),
    description: template.description,
    isDefault: template.isDefault === true || variantId === 'default',
    granularity: template.granularity,
    sortOrder: template.sortOrder,
    enabled: template.enabled !== false,
    fields: template.fields,
    outputTemplate: template.outputTemplate,
    targetFile: template.targetFile,
    appendUnderHeader: template.appendUnderHeader,
    defaultValues: template.defaultValues || {},
    requiredFields: template.requiredFields || [],
    createdAt: template.createdAt || previous?.createdAt || timestamp,
    updatedAt: template.updatedAt || timestamp,
  } as any;
}

export function getGoalTemplates(goalSettings?: Pick<GoalSettings, 'goalBlockBindings'> | null): GoalTemplate[] {
  return (goalSettings?.goalBlockBindings || []).map(fromLegacyGoalTemplateStorage);
}

export function getGoalTemplateId(goalId: string, coreBlockId: string, variantId: string = 'default'): string {
  const normalizedVariantId = normalizeVariantId(variantId);
  const base = `goal-template.${safeIdPart(goalId)}.${safeIdPart(coreBlockId)}`;
  return normalizedVariantId === 'default' ? base : `${base}.${safeIdPart(normalizedVariantId)}`;
}

function pathCandidates(path?: string | null): string[] {
  const parts = String(path || '').split('/').map((part) => part.trim()).filter(Boolean);
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}

export function getGoalTemplateCandidateGoalIds(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null): string[] {
  if (!goal) return [];
  const goals = goalSettings?.goals || [];
  const ids: string[] = [goal.id];
  const path = splitGoalPath(goal.goalPath || goal.title).goalPath;
  const byPath = new Map(goals.map((item) => [splitGoalPath(item.goalPath || item.title).goalPath, item]));
  for (const parentPath of pathCandidates(path).slice(1)) {
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
    .filter((template) => template.enabled !== false && candidateGoalIds.includes(template.goalId) && template.coreBlockId === coreBlockId)
    .sort((a, b) => {
      const byGoal = (rank.get(a.goalId) ?? 999) - (rank.get(b.goalId) ?? 999);
      if (byGoal !== 0) return byGoal;
      const bySortOrder = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
      if (bySortOrder !== 0) return bySortOrder;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return String(a.name || a.variantId || '').localeCompare(String(b.name || b.variantId || ''), 'zh-CN');
    });
}

export function findGoalTemplate(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null, coreBlockId: string, variantId?: string | null): GoalTemplate | null {
  const variants = getGoalTemplateVariants(goalSettings, goal, coreBlockId);
  if (!variants.length) return null;
  const normalizedVariantId = normalizeVariantId(variantId);
  if (variantId) {
    const exact = variants.find((template) => normalizeVariantId(template.variantId) === normalizedVariantId || template.id === variantId);
    if (exact) return exact;
  }
  return variants.find((template) => template.isDefault === true)
    || variants.find((template) => normalizeVariantId(template.variantId) === 'default')
    || variants[0]
    || null;
}

/** Storage helper: hides the legacy goalBlockBindings storage field from application code. */
export function upsertGoalTemplateInSettings(goalSettings: GoalSettings, template: GoalTemplate): GoalSettings {
  const previousRows = goalSettings.goalBlockBindings || [];
  const variantId = normalizeVariantId(template.variantId);
  const nextTemplate = { ...template, variantId, id: template.id || getGoalTemplateId(template.goalId, template.coreBlockId, variantId) };
  const rows = previousRows.slice();
  const index = rows.findIndex((item: any) => {
    const itemVariantId = normalizeVariantId(item.variantId || parseVariantIdFromLegacyId(item.id));
    return item.id === nextTemplate.id || (item.goalId === nextTemplate.goalId && item.coreBlockId === nextTemplate.coreBlockId && itemVariantId === variantId);
  });
  const next = toLegacyGoalTemplateStorage(nextTemplate, index >= 0 ? rows[index] : null);

  // One default per Goal + Block. If the saved template is default, demote siblings.
  const shouldDefault = (next as any).isDefault === true || (next as any).variantId === 'default';
  const normalizedRows = rows.map((row: any, rowIndex) => {
    if (rowIndex === index) return row;
    if (!shouldDefault) return row;
    const sameCell = row.goalId === next.goalId && row.coreBlockId === next.coreBlockId;
    return sameCell ? { ...row, isDefault: false } : row;
  });
  if (index >= 0) normalizedRows[index] = next;
  else normalizedRows.push(next);
  return { ...goalSettings, goalBlockBindings: normalizedRows };
}

/** Storage helper: removes a GoalTemplate while keeping the legacy storage field private to this module. */
export function removeGoalTemplateFromSettings(goalSettings: GoalSettings, goalId: string, coreBlockId: string, variantId: string = 'default'): GoalSettings {
  const normalizedVariantId = normalizeVariantId(variantId);
  return {
    ...goalSettings,
    goalBlockBindings: (goalSettings.goalBlockBindings || []).filter((template: any) => {
      const itemVariantId = normalizeVariantId(template.variantId || parseVariantIdFromLegacyId(template.id));
      return !(template.goalId === goalId && template.coreBlockId === coreBlockId && itemVariantId === normalizedVariantId);
    }),
  };
}

export function removeGoalTemplatesForGoal(goalSettings: GoalSettings, goalId: string): GoalSettings {
  return {
    ...goalSettings,
    goalBlockBindings: (goalSettings.goalBlockBindings || []).filter((template) => template.goalId !== goalId),
  };
}
