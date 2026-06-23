import type { CoreBlockDefinition } from '@/core/blocks';
import type { TemplateField } from '@/core/types/schema';
import type { GoalDefinition, PeriodPolicy } from './types';
import type { GoalTemplate } from './templates';
import { isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity } from './period';
import { isSystemRecordContextField } from './templateVariant';

export interface CompactGoalTemplateOptions {
  coreBlock?: Pick<CoreBlockDefinition, 'id' | 'fields' | 'outputTemplate' | 'targetFile' | 'appendUnderHeader' | 'periodPolicy'> | null;
  goal?: Pick<GoalDefinition, 'themePath'> | null;
}

const ALLOWED_SYSTEM_DEFAULT_KEYS = new Set(['themePath', '主题', 'icon', '图标']);
const FORBIDDEN_DEFAULT_KEYS = new Set([
  'legacyOverrideId',
  'legacyThemePath',
  'goalId',
  '目标ID',
  'goalPath',
  '目标',
  'templateId',
  '模板ID',
  'templateSourceType',
  '模板来源',
  'templateVariantId',
  'goalTemplateVariantId',
  '变体ID',
  '记录预设',
  'period',
  'periodId',
  'cycleId',
  '周期',
  '周期ID',
  '周期粒度',
  'goalGranularity',
]);

function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (input: any): any => {
    if (input === undefined) return undefined;
    if (input === null || typeof input !== 'object') return input;
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (Array.isArray(input)) return input.map(normalize);
    const out: Record<string, unknown> = {};
    Object.keys(input).sort().forEach((key) => {
      const value = normalize(input[key]);
      if (value !== undefined) out[key] = value;
    });
    return out;
  };
  return JSON.stringify(normalize(value));
}

function compactFieldForStructureCompare(field: TemplateField): Record<string, unknown> {
  const source = field as any;
  const out: Record<string, unknown> = {};
  Object.keys(source || {}).sort().forEach((key) => {
    if (key === 'id' || key === 'defaultValue' || key === 'required') return;
    const value = source[key];
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  });
  return out;
}

function fieldsHaveSameStructure(left?: TemplateField[], right?: TemplateField[]): boolean {
  const normalize = (fields?: TemplateField[]) => (fields || []).map(compactFieldForStructureCompare);
  return stableJson(normalize(left)) === stableJson(normalize(right));
}

function deriveRequiredFields(fields?: TemplateField[]): string[] {
  return (fields || [])
    .filter((field: any) => field?.required === true)
    .map((field: any) => compactText(field.key || field.label))
    .filter(Boolean);
}

function equalStringSet(left?: string[], right?: string[]): boolean {
  const a = new Set((left || []).map(compactText).filter(Boolean));
  const b = new Set((right || []).map(compactText).filter(Boolean));
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function getFieldDefaultMap(fields?: TemplateField[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields || []) {
    const key = compactText((field as any).key || (field as any).label);
    if (!key) continue;
    const value = (field as any).defaultValue;
    if (value !== undefined && value !== null && compactText(value) !== '') result[key] = compactText(value);
  }
  return result;
}

function compactDefaultValues(
  values: Record<string, unknown> | undefined,
  baseFields: TemplateField[] | undefined,
  goal?: Pick<GoalDefinition, 'themePath'> | null,
): Record<string, unknown> | undefined {
  const baseDefaults = getFieldDefaultMap(baseFields);
  const goalThemePath = compactText(goal?.themePath);
  const result: Record<string, unknown> = {};

  Object.entries(values || {}).forEach(([key, raw]) => {
    if (FORBIDDEN_DEFAULT_KEYS.has(key)) return;
    const value = compactText(raw);
    if (!value) return;
    if (isSystemRecordContextField(key) && !ALLOWED_SYSTEM_DEFAULT_KEYS.has(key)) return;
    if ((key === 'themePath' || key === '主题') && (value === goalThemePath || value === '{{goal.themePath}}')) return;
    if (baseDefaults[key] !== undefined && baseDefaults[key] === value) return;
    result[key] = raw;
  });

  return Object.keys(result).length ? result : undefined;
}

function normalizePeriodPolicyForTemplate(template: GoalTemplate): PeriodPolicy | undefined {
  if (!isPeriodAwareCoreBlock(template.coreBlockId)) return undefined;
  const policy = template.periodPolicy;
  if (policy && policy.enabled !== false) {
    return { enabled: true, granularity: normalizePeriodPolicyGranularity(policy.granularity) };
  }
  return undefined;
}

/**
 * Keep Template Variant storage differential.
 * CoreBlock is the source of truth; Template Variant only persists true overrides.
 */
export function compactGoalTemplateForStorage(template: GoalTemplate, options: CompactGoalTemplateOptions = {}): GoalTemplate {
  const coreBlock = options.coreBlock || null;
  const baseFields = coreBlock?.fields as TemplateField[] | undefined;
  const next: GoalTemplate = {
    ...template,
    granularity: undefined,
  };

  if (!isPeriodAwareCoreBlock(template.coreBlockId)) {
    next.periodPolicy = undefined;
  } else {
    next.periodPolicy = normalizePeriodPolicyForTemplate(template);
  }

  if (coreBlock) {
    if (fieldsHaveSameStructure(template.fields, baseFields)) next.fields = undefined;
    if (compactText(template.outputTemplate) === compactText(coreBlock.outputTemplate)) next.outputTemplate = undefined;
    if (compactText(template.targetFile) === compactText(coreBlock.targetFile)) next.targetFile = undefined;
    if (compactText(template.appendUnderHeader) === compactText(coreBlock.appendUnderHeader)) next.appendUnderHeader = undefined;

    const explicitRequired = template.requiredFields && template.requiredFields.length ? template.requiredFields : deriveRequiredFields(template.fields);
    const baseRequired = deriveRequiredFields(baseFields);
    next.requiredFields = equalStringSet(explicitRequired || [], baseRequired) ? undefined : (explicitRequired || []).filter(Boolean);
  } else if (next.requiredFields && !next.requiredFields.length) {
    next.requiredFields = undefined;
  }

  next.defaultValues = compactDefaultValues(template.defaultValues, baseFields, options.goal);

  return next;
}

export function describeGoalTemplateStorageDiff(template: GoalTemplate): string[] {
  const parts: string[] = [];
  if (template.fields?.length) parts.push('字段覆盖');
  if (template.defaultValues && Object.keys(template.defaultValues).length) parts.push(`默认值 ${Object.keys(template.defaultValues).length}`);
  if (template.outputTemplate) parts.push('输出覆盖');
  if (template.targetFile) parts.push('文件覆盖');
  if (template.appendUnderHeader) parts.push('标题覆盖');
  if (template.requiredFields?.length) parts.push('必填覆盖');
  if (template.periodPolicy) parts.push(`周期 ${template.periodPolicy.granularity}`);
  return parts;
}
