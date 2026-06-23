/**
 * Template Variant domain contract
 * ---------------------------------------------------------------
 * Template Variant（记录预设）是 Goal × CoreBlock 单元格里的具体写法。
 * 它不是主题覆盖，不是 Block 本身，也不是最终 Markdown 记录。
 */

export const DEFAULT_TEMPLATE_VARIANT_ID = 'default';

export type TemplateVariantId = string;

export interface TemplateVariantIdentity {
  goalId: string;
  coreBlockId: string;
  variantId: TemplateVariantId;
}

/**
 * QuickInput / Markdown 渲染所需的系统上下文字段。
 * 这些字段可以写入最终记录，但不应该作为普通用户输入项暴露在快捷表单主区。
 */
export const SYSTEM_RECORD_CONTEXT_FIELD_KEYS = [
  'goalId',
  '目标ID',
  'goalPath',
  '目标',
  '目标路径',
  'rootGoal',
  'leafGoal',
  'coreBlock',
  'coreBlockId',
  '核心Block',
  'templateId',
  '模板ID',
  'templateSourceType',
  '模板来源',
  'templateVariantId',
  'goalTemplateVariantId',
  '变体ID',
  '记录预设',
  'cycleId',
  '周期ID',
  'periodId',
  'period',
  '周期',
  '周期粒度',
  'goalGranularity',
  'themeId',
  'themePath',
  '主题',
  'rootTheme',
  'leafTheme',
] as const;

const SYSTEM_RECORD_CONTEXT_FIELD_KEY_SET = new Set<string>(SYSTEM_RECORD_CONTEXT_FIELD_KEYS);
const SYSTEM_RECORD_CONTEXT_SEMANTICS = new Set<string>([
  'goalId',
  'goalPath',
  'goalPaths',
  'goals',
  'coreBlock',
  'templateId',
  'templateSourceType',
  'templateVariantId',
  'cycleId',
  'period',
  'themeId',
  'themePath',
]);

export function isSystemRecordContextField(key?: string | null, label?: string | null, semantic?: string | null): boolean {
  const normalizedKey = String(key || '').trim();
  const normalizedLabel = String(label || '').trim();
  const normalizedSemantic = String(semantic || '').trim();
  return SYSTEM_RECORD_CONTEXT_FIELD_KEY_SET.has(normalizedKey)
    || SYSTEM_RECORD_CONTEXT_FIELD_KEY_SET.has(normalizedLabel)
    || SYSTEM_RECORD_CONTEXT_SEMANTICS.has(normalizedSemantic);
}

export function normalizeTemplateVariantId(value?: string | null): string {
  const normalized = String(value || '').trim();
  return normalized || DEFAULT_TEMPLATE_VARIANT_ID;
}

export function isDefaultTemplateVariant(value?: string | null): boolean {
  return normalizeTemplateVariantId(value) === DEFAULT_TEMPLATE_VARIANT_ID;
}
