import type { FilterRule, SortRule, ViewInstance } from '@/core/view/ViewConfig';
import { normalizeViewDateRole } from './dateRole';

/**
 * View domain field policy
 * -----------------------------------------------------------------------------
 * Goal × Record Type is the primary view axis. View configs use canonical field keys;
 * only current user-facing labels are normalized at the UI boundary.
 */
export const VIEW_PRIMARY_FIELD_KEYS = [
  'goalPath',
  'recordType',
  'date',
  'content',
  'title',
] as const;

export const VIEW_FIELD_ALIASES: Record<string, string> = {
  目标: 'goalPath',
  记录类型: 'recordType',
  日期: 'date',
  内容: 'content',
  状态: 'status',
};

const PERIOD_VIEW_FIELDS = new Set(['period.id', 'period.label', 'period.granularity']);

/** Fields that may exist in parsed records, but should not be used as default visible columns. */
export const VIEW_NOISY_DISPLAY_FIELDS = new Set<string>([
  'period.id',
  'period.label',
  'period.granularity',
]);

export function normalizeViewFieldKey(field: string): string {
  const raw = String(field || '').trim();
  if (!raw) return '';
  return VIEW_FIELD_ALIASES[raw] || raw;
}

export function isNoisyViewDisplayField(field: string): boolean {
  return VIEW_NOISY_DISPLAY_FIELDS.has(normalizeViewFieldKey(field));
}

export function isPeriodViewField(field: string): boolean {
  return PERIOD_VIEW_FIELDS.has(normalizeViewFieldKey(field));
}


function normalizeRuleValue(field: string, value: any): any {
  const normalizedField = normalizeViewFieldKey(field);
  if (normalizedField !== 'recordType') return value;

  const mapOne = (item: unknown) => {
    const text = String(item ?? '').trim();
    if (text === '打卡') return 'habit';
    if (text === '任务') return 'task';
    if (text === '计划') return 'plan';
    if (text === '总结') return 'review';
    if (text === '思考' || text === '闪念') return 'thought';
    if (text === '事件') return 'event';
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
    if (!field) continue;

    result.push({ ...rule, field, value: normalizeRuleValue(field, rule.value) });
  }
  return result.map((rule, index) => {
    const next: FilterRule = { ...rule };
    if (index === result.length - 1) delete next.logic;
    else if (!next.logic) next.logic = 'and';
    return next;
  });
}

export function normalizeViewSort(sort: readonly SortRule[] | undefined): SortRule[] {
  const seen = new Set<string>();
  const result: SortRule[] = [];
  for (const rule of sort || []) {
    const field = normalizeViewFieldKey(rule.field);
    if (!field || seen.has(field)) continue;
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
    if (!key || isNoisyViewDisplayField(key) || seen.has(key)) continue;
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
  const dateRole = normalizeViewDateRole(next.dateRole);
  if (dateRole) next.dateRole = dateRole;
  else delete next.dateRole;
  if (Array.isArray(next.categories) && next.categories.length === 0) delete next.categories;
  if (Array.isArray(next.goalPaths) && next.goalPaths.length === 0) delete next.goalPaths;
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
