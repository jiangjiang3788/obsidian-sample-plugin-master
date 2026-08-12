import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { getGoalTemplateId, isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity } from '@core/goal/public';
import { compactText } from '@core/semantics/public';
import { getThemePathLeaf, normalizeThemePath } from '@core/theme/public';
import { isGoalPathTemplateField, isIconTemplateField, isThemeTemplateField } from '@core/fields/public';

export const GOAL_TEMPLATE_BLOCK_ORDER = ['打卡', '任务', '事件', '思考', '总结', '计划', '阻碍项', '里程碑'];
const GOAL_TEMPLATE_BLOCK_ID_ORDER = ['core.habit', 'core.task', 'core.evidence', 'core.thought', 'core.review', 'core.plan', 'core.blocker', 'core.milestone'];

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDefault(value: unknown): string {
  const text = compactText(value);
  if (!text || text === '{{goal.themePath}}') return '';
  return text;
}

function safeVariantPart(value: unknown): string {
  const text = String(value ?? '').trim() || 'preset';
  return text
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.:\-/\u4e00-\u9fff]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'preset';
}

function readFieldDefault(fields: TemplateField[] | undefined, predicate: (field: TemplateField) => boolean): string {
  for (const field of fields || []) {
    if (!predicate(field)) continue;
    const value = normalizeDefault(field.defaultValue);
    if (value) return value;
  }
  return '';
}

export function orderGoalTemplateBlocks(blocks: CoreBlockDefinition[]): CoreBlockDefinition[] {
  const order = new Map<string, number>();
  GOAL_TEMPLATE_BLOCK_ORDER.forEach((name, index) => order.set(name, index));
  GOAL_TEMPLATE_BLOCK_ID_ORDER.forEach((id, index) => order.set(id, index));
  return [...blocks].sort((left, right) => {
    const leftRank = order.get(left.id) ?? order.get(left.name) ?? 999;
    const rightRank = order.get(right.id) ?? order.get(right.name) ?? 999;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left.name || left.id).localeCompare(String(right.name || right.id), 'zh-CN');
  });
}

export function getGoalTemplateDisplayName(template: Pick<GoalTemplate, 'name' | 'variantId'>): string {
  const name = String(template.name || '').trim();
  if (name) return name;
  const variantId = String(template.variantId || '').trim();
  if (variantId) return variantId;
  return '未命名预设';
}

export function readGoalTemplateThemePath(template: GoalTemplate | null | undefined, goal?: GoalDefinition | null): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return normalizeThemePath(normalizeDefault(values.themePath)
    || normalizeDefault(values['主题'])
    || readFieldDefault(template?.fields, isThemeTemplateField)
    || normalizeDefault(goal?.themePath));
}

export function readGoalTemplateIcon(template: GoalTemplate | null | undefined, themeIcon?: string): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return String(normalizeDefault(values.icon)
    || normalizeDefault(values['图标'])
    || normalizeDefault(values['theme.icon'])
    || readFieldDefault(template?.fields, isIconTemplateField)
    || themeIcon
    || '').trim();
}

export function findExistingTemplateForTheme(
  templates: GoalTemplate[],
  goal: GoalDefinition,
  targetBlock: CoreBlockDefinition,
  sourceTemplate: GoalTemplate,
): GoalTemplate | null {
  const sourceThemePath = readGoalTemplateThemePath(sourceTemplate, goal);
  const sourceName = getGoalTemplateDisplayName(sourceTemplate);
  return templates.find((template) => {
    if (template.goalId !== goal.id || template.coreBlockId !== targetBlock.id || template.enabled === false) return false;
    const targetThemePath = readGoalTemplateThemePath(template, goal);
    if (sourceThemePath && targetThemePath && sourceThemePath === targetThemePath) return true;
    if (!sourceThemePath && getGoalTemplateDisplayName(template) === sourceName) return true;
    return false;
  }) || null;
}

function nextVariantId(goal: GoalDefinition, targetBlock: CoreBlockDefinition, templates: GoalTemplate[], baseLabel: string): string {
  const sameCell = templates.filter((template) => template.goalId === goal.id && template.coreBlockId === targetBlock.id);
  const used = new Set(sameCell.map((template) => String(template.variantId || 'default')));
  const base = safeVariantPart(baseLabel);
  if (!used.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function buildTargetFields(block: CoreBlockDefinition, goal: GoalDefinition, themePath: string, icon: string): TemplateField[] {
  return cloneValue(block.fields || []).map((field: TemplateField) => {
    if (isThemeTemplateField(field)) return { ...field, defaultValue: themePath || field.defaultValue || '{{goal.themePath}}' } as TemplateField;
    if (isIconTemplateField(field)) return { ...field, defaultValue: icon || field.defaultValue || '' } as TemplateField;
    if (isGoalPathTemplateField(field)) return { ...field, defaultValue: goal.goalPath || goal.title || goal.id } as TemplateField;
    return field;
  });
}

export function buildRetargetedGoalTemplate(input: {
  sourceTemplate: GoalTemplate;
  sourceBlock: CoreBlockDefinition;
  targetBlock: CoreBlockDefinition;
  sourceGoal: GoalDefinition;
  targetGoal: GoalDefinition;
  templates: GoalTemplate[];
  themeIcon?: string;
  reason?: 'copy' | 'move';
}): GoalTemplate {
  const { sourceTemplate, sourceBlock, targetBlock, sourceGoal, targetGoal, templates, themeIcon, reason = 'copy' } = input;
  const themePath = readGoalTemplateThemePath(sourceTemplate, sourceGoal);
  const icon = readGoalTemplateIcon(sourceTemplate, themeIcon);
  const name = getGoalTemplateDisplayName(sourceTemplate);
  const label = themePath ? getThemePathLeaf(themePath) : name;
  const variantId = nextVariantId(targetGoal, targetBlock, templates, label || name || targetBlock.name);
  const goalPath = targetGoal.goalPath || targetGoal.title || targetGoal.id;
  const defaultValues: Record<string, unknown> = {
    themePath,
    '主题': themePath,
    goalId: targetGoal.id,
    goalPath,
    '目标': goalPath,
  };
  if (icon) {
    defaultValues.icon = icon;
    defaultValues['图标'] = icon;
  }
  const fields = buildTargetFields(targetBlock, targetGoal, themePath, icon);
  const now = new Date().toISOString();
  return {
    id: getGoalTemplateId(targetGoal.id, targetBlock.id, variantId),
    goalId: targetGoal.id,
    coreBlockId: targetBlock.id,
    variantId,
    name,
    description: reason === 'move'
      ? `由「${sourceGoal.goalPath || sourceGoal.title} / ${sourceBlock.name}」移动到「${targetGoal.goalPath || targetGoal.title} / ${targetBlock.name}」`
      : `由「${sourceBlock.name}」预设复制到「${targetBlock.name}」`,
    periodPolicy: isPeriodAwareCoreBlock(targetBlock.id) ? { enabled: true, granularity: normalizePeriodPolicyGranularity(sourceTemplate.periodPolicy?.granularity || targetBlock.periodPolicy?.granularity) } : undefined,
    sortOrder: templates.filter((template) => template.goalId === targetGoal.id && template.coreBlockId === targetBlock.id).length * 10,
    enabled: sourceTemplate.enabled !== false,
    fields,
    targetFile: targetBlock.targetFile,
    appendUnderHeader: targetBlock.appendUnderHeader,
    requiredFields: fields.filter((field) => field.required).map((field) => field.key).filter(Boolean),
    defaultValues,
    createdAt: reason === 'move' ? sourceTemplate.createdAt || now : now,
    updatedAt: now,
  };
}

export function buildCopiedGoalTemplate(input: {
  sourceTemplate: GoalTemplate;
  sourceBlock: CoreBlockDefinition;
  targetBlock: CoreBlockDefinition;
  goal: GoalDefinition;
  templates: GoalTemplate[];
  themeIcon?: string;
}): GoalTemplate {
  return buildRetargetedGoalTemplate({
    sourceTemplate: input.sourceTemplate,
    sourceBlock: input.sourceBlock,
    targetBlock: input.targetBlock,
    sourceGoal: input.goal,
    targetGoal: input.goal,
    templates: input.templates,
    themeIcon: input.themeIcon,
    reason: 'copy',
  });
}
