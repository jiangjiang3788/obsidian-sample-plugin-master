import type { FilterRule, SortRule, ViewInstance } from '../types/schema';

/**
 * View domain field policy
 * -----------------------------------------------------------------------------
 * Goal × Block is the primary view axis. This module keeps view configuration
 * from drifting back toward old category / cycle / template-source fields.
 */
export const VIEW_PRIMARY_FIELD_KEYS = [
  'goalPath',
  'goalId',
  'coreBlock',
  'themePath',
  'date',
  'content',
  'title',
] as const;

export const VIEW_LEGACY_FIELD_ALIASES: Record<string, string> = {
  category: 'coreBlock',
  categoryPath: 'coreBlock',
  categoryKey: 'coreBlock',
  baseCategory: 'coreBlock',
  leafCategory: 'coreBlock',
  block: 'coreBlock',
  blockId: 'coreBlock',
  coreBlockId: 'coreBlock',
  cycleId: 'period.id',
  周期ID: 'period.id',
  periodId: 'period.id',
  period: 'period.label',
  周期: 'period.label',
  granularity: 'period.granularity',
  周期粒度: 'period.granularity',
  recurrence: 'repeatToken',
  repeat: 'repeatToken',
  重复: 'repeatToken',
  templateSourceType: 'templateSource',
  模板来源: 'templateSource',
  模板ID: 'templateId',
  目标: 'goalPath',
  目标ID: 'goalId',
  主题: 'themePath',
  核心Block: 'coreBlock',
};

const TEMPLATE_SOURCE_FIELDS = new Set(['templateSource', 'templateSourceType']);
const PERIOD_VIEW_FIELDS = new Set(['period.id', 'period.label', 'period.granularity']);

/** Fields that may exist in parsed records, but should not be used as default visible columns. */
export const VIEW_NOISY_DISPLAY_FIELDS = new Set<string>([
  'templateSource',
  'templateSourceType',
  'templateId',
  'period.id',
  'period.label',
  'period.granularity',
  'repeatToken',
]);

export function normalizeViewFieldKey(field: string): string {
  const raw = String(field || '').trim();
  if (!raw) return '';
  return VIEW_LEGACY_FIELD_ALIASES[raw] || raw;
}

export function isNoisyViewDisplayField(field: string): boolean {
  return VIEW_NOISY_DISPLAY_FIELDS.has(normalizeViewFieldKey(field));
}

export function isTemplateSourceViewField(field: string): boolean {
  return TEMPLATE_SOURCE_FIELDS.has(normalizeViewFieldKey(field));
}

export function isPeriodViewField(field: string): boolean {
  return PERIOD_VIEW_FIELDS.has(normalizeViewFieldKey(field));
}

function normalizeMultiValue(value: any): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap(v => String(v ?? '').split(/[,，\n]/))
    .map(part => part.trim())
    .filter(Boolean);
}

function readLegacyTaskStatusValue(value: any): 'open' | 'done' | 'cancelled' | null {
  const values = normalizeMultiValue(value);
  if (values.some(text => text === '完成任务' || text.endsWith('/done'))) return 'done';
  if (values.some(text => text.endsWith('/cancelled'))) return 'cancelled';
  if (values.some(text => text === '未完成任务' || text.endsWith('/todo'))) return 'open';
  return null;
}

function isLegacyCategoryRuleField(field: string): boolean {
  return ['category', 'categoryKey', 'categoryPath', 'baseCategory', 'leafCategory', '分类', '类别', '分类路径'].includes(String(field || '').trim());
}

function normalizeRuleValue(field: string, value: any): any {
  const normalizedField = normalizeViewFieldKey(field);
  if (normalizedField !== 'coreBlock') return value;

  const mapOne = (item: unknown) => {
    const text = String(item ?? '').trim();
    if (text === '打卡') return 'habit';
    if (text === '任务' || text === '未完成任务' || text === '完成任务') return 'task';
    if (text === '计划') return 'plan';
    if (text === '总结') return 'review';
    if (text === '思考' || text === '闪念') return 'thought';
    if (text === '事件') return 'evidence';
    if (text === '阻碍项') return 'blocker';
    if (text === '里程碑') return 'milestone';
    if (text.startsWith('core.')) return text.slice('core.'.length);
    return item;
  };

  return Array.isArray(value) ? value.map(mapOne) : mapOne(value);
}

export function normalizeViewFilters(filters: readonly FilterRule[] | undefined): FilterRule[] {
  const result: FilterRule[] = [];
  for (const rule of filters || []) {
    const rawField = String(rule.field || '').trim();
    const field = normalizeViewFieldKey(rawField);
    if (!field || isTemplateSourceViewField(field)) continue;

    const legacyTaskStatus = isLegacyCategoryRuleField(rawField) ? readLegacyTaskStatusValue(rule.value) : null;
    if (legacyTaskStatus) {
      result.push({ ...rule, field: 'coreBlock', value: 'task' });
      result.push({ field: 'taskStatus', op: rule.op, value: legacyTaskStatus });
      continue;
    }

    result.push({ ...rule, field, value: normalizeRuleValue(field, rule.value) });
  }
  return result.map((rule, index) => {
    const next: FilterRule = { ...rule };
    if (index === result.length - 1) delete (next as any).logic;
    else if (!next.logic) next.logic = 'and';
    return next;
  });
}

export function normalizeViewSort(sort: readonly SortRule[] | undefined): SortRule[] {
  const seen = new Set<string>();
  const result: SortRule[] = [];
  for (const rule of sort || []) {
    const field = normalizeViewFieldKey(rule.field);
    if (!field || isTemplateSourceViewField(field) || seen.has(field)) continue;
    seen.add(field);
    result.push({ ...rule, field });
  }
  return result;
}

export function normalizeViewGroupFields(groupFields: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const field of groupFields || []) {
    const key = normalizeViewFieldKey(field);
    if (!key || isTemplateSourceViewField(key) || isNoisyViewDisplayField(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}


export function normalizeViewConfigDomain(viewConfig: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!viewConfig) return viewConfig;
  const next: Record<string, any> = { ...viewConfig };
  for (const key of ['rowField', 'colField', 'valueField', 'dateField', 'groupField']) {
    if (next[key]) next[key] = normalizeViewFieldKey(next[key]);
  }
  if (next.groupBy === 'category' || next.groupBy === 'categoryKey') next.groupBy = 'coreBlock';
  if (Array.isArray(next.categories) && next.categories.length === 0) delete next.categories;
  if (Array.isArray(next.themePaths) && next.themePaths.length === 0) delete next.themePaths;
  return next;
}

export function normalizeViewInstanceDomain(view: ViewInstance): ViewInstance {
  return {
    ...view,
    group: view.group ? normalizeViewFieldKey(view.group) : view.group,
    viewConfig: normalizeViewConfigDomain(view.viewConfig as any),
    groupFields: normalizeViewGroupFields(view.groupFields || []),
    filters: normalizeViewFilters(view.filters || []),
    sort: normalizeViewSort(view.sort || []),
  };
}
