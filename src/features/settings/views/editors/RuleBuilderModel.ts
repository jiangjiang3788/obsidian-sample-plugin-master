import type { DataStore } from '@core/services/public';
import type { FilterRule, SortRule } from '@core/types/public';
import { getAllFields, readField } from '@core/types/public';
import { getFieldLabel } from '@core/fields/public';
import { normalizeViewMultiValue } from '@core/view/public';

export type RuleBuilderMode = 'filter' | 'sort';
export type RuleBuilderVariant = 'compact' | 'panel';
export type RuleBuilderRule = FilterRule | SortRule;

export const DEFAULT_FILTER_RULE: FilterRule = { field: '', op: '=', value: '' };
export const DEFAULT_SORT_RULE: SortRule = { field: '', dir: 'asc' };

export const RULE_OPERATOR_OPTIONS = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: 'includes', label: '包含' },
  { value: 'regex', label: '正则' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: 'in', label: '属于任一' },
  { value: 'notIn', label: '不属于任一' },
  { value: 'between', label: '区间' },
  { value: 'empty', label: '为空' },
  { value: 'notEmpty', label: '非空' },
];

export const RULE_DIRECTION_OPTIONS = [
  { value: 'asc', label: '升序' },
  { value: 'desc', label: '降序' },
];

export const RULE_LOGIC_OPTIONS = [
  { value: 'and', label: '且' },
  { value: 'or', label: '或' },
];

export function cloneRule<T extends RuleBuilderRule>(rule: T): T {
  return { ...rule };
}

export function makeDefaultRule(mode: RuleBuilderMode): RuleBuilderRule {
  return mode === 'filter' ? { ...DEFAULT_FILTER_RULE } : { ...DEFAULT_SORT_RULE };
}

export function operatorNeedsValue(op: FilterRule['op']): boolean {
  return !['empty', 'notEmpty'].includes(op);
}

export function isMultiValueOperator(op?: FilterRule['op']): boolean {
  return op === 'in' || op === 'notIn';
}

export function getRuleValuePlaceholder(op?: FilterRule['op']): string {
  if (op === 'between') return '输入区间，如 1~5 或 2026-01-01~2026-01-31';
  if (isMultiValueOperator(op)) return '选择或输入多个值，回车确认';
  return '输入值';
}

export function normalizeMultiValue(value: unknown): string[] {
  return normalizeViewMultiValue(value);
}

export function formatRuleValue(rule: FilterRule): string {
  if (!operatorNeedsValue(rule.op)) return '';
  if (isMultiValueOperator(rule.op)) {
    const values = normalizeMultiValue(rule.value);
    return values.length > 0 ? values.join('、') : '未选择';
  }
  if (rule.op === 'between' && Array.isArray(rule.value)) {
    return rule.value.map(v => String(v)).join(' ~ ');
  }
  return String(rule.value ?? '');
}

export function buildRuleLabel(mode: RuleBuilderMode, rule: RuleBuilderRule): string {
  if (mode === 'filter') {
    const filterRule = rule as FilterRule;
    if (filterRule.op === 'empty') return `${getFieldLabel(filterRule.field)} 为空`;
    if (filterRule.op === 'notEmpty') return `${getFieldLabel(filterRule.field)} 非空`;
    const valueText = formatRuleValue(filterRule);
    const opText = filterRule.op === 'in' ? '属于任一' : filterRule.op === 'notIn' ? '不属于任一' : filterRule.op;
    return `${getFieldLabel(filterRule.field)} ${opText} "${valueText}"`;
  }
  const sortRule = rule as SortRule;
  return `${getFieldLabel(sortRule.field)} ${sortRule.dir === 'asc' ? '升序' : '降序'}`;
}

export function normalizeFilterPatch(patch: Partial<FilterRule>, current?: FilterRule): Partial<FilterRule> {
  const nextOp = (patch.op ?? current?.op) as FilterRule['op'] | undefined;
  const normalized: Partial<FilterRule> = { ...patch };

  if (nextOp && !operatorNeedsValue(nextOp)) {
    return { ...normalized, value: '' };
  }

  if (patch.field !== undefined && patch.field !== current?.field) {
    normalized.value = nextOp && isMultiValueOperator(nextOp) ? [] : '';
  }

  if (nextOp && isMultiValueOperator(nextOp)) {
    if ('value' in normalized || patch.op !== undefined) {
      normalized.value = normalizeMultiValue(normalized.value ?? current?.value);
    }
  } else if (current && isMultiValueOperator(current.op) && patch.op !== undefined) {
    normalized.value = normalizeMultiValue(current.value).join(',');
  }

  return normalized;
}

export function patchRule(mode: RuleBuilderMode, rule: RuleBuilderRule, patch: Partial<RuleBuilderRule>): RuleBuilderRule {
  const nextPatch = mode === 'filter'
    ? normalizeFilterPatch(patch as Partial<FilterRule>, rule as FilterRule)
    : patch;
  return { ...rule, ...nextPatch };
}

export function patchRuleRows(
  mode: RuleBuilderMode,
  rows: RuleBuilderRule[],
  index: number,
  patch: Partial<RuleBuilderRule>
): RuleBuilderRule[] {
  return rows.map((row, rowIndex) => rowIndex === index ? patchRule(mode, row, patch) : cloneRule(row));
}

export function patchRuleLogic(
  rows: RuleBuilderRule[],
  index: number,
  logic: 'and' | 'or',
  isFilterMode: boolean
): RuleBuilderRule[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index || !isFilterMode) return cloneRule(row);
    return { ...(row as FilterRule), logic };
  });
}

export function removeRuleAt(rows: RuleBuilderRule[], index: number): RuleBuilderRule[] {
  return rows.filter((_, rowIndex) => rowIndex !== index).map(cloneRule);
}

export function appendRule(mode: RuleBuilderMode, rows: RuleBuilderRule[], newRule: RuleBuilderRule): RuleBuilderRule[] {
  const updatedRows = rows.map(cloneRule);
  const ruleToAdd = cloneRule(newRule);

  if (mode === 'filter' && updatedRows.length > 0) {
    const lastIndex = updatedRows.length - 1;
    const lastRule = updatedRows[lastIndex] as FilterRule;
    if (!lastRule.logic) {
      updatedRows[lastIndex] = {
        ...lastRule,
        logic: 'and',
      };
    }
  }

  updatedRows.push(ruleToAdd);
  return updatedRows;
}

export function shouldShowRuleValueInput(mode: RuleBuilderMode, rule: RuleBuilderRule): boolean {
  return mode !== 'filter' || operatorNeedsValue((rule as FilterRule).op);
}

export function getPanelRuleGridTemplate(mode: RuleBuilderMode, showValueInput: boolean): string {
  if (mode !== 'filter') return 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(96px, 0.35fr) 40px';
  return showValueInput
    ? 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(260px, 1.2fr) minmax(96px, 0.35fr) 40px'
    : 'minmax(240px, 1.2fr) minmax(150px, 0.6fr) minmax(96px, 0.35fr) 40px';
}

export function getPanelAddRuleGridTemplate(mode: RuleBuilderMode, showValueInput: boolean): string {
  if (mode !== 'filter') return 'minmax(260px, 1.4fr) minmax(150px, 0.6fr) auto';
  return showValueInput
    ? 'minmax(260px, 1.4fr) minmax(150px, 0.6fr) minmax(260px, 1.3fr) auto'
    : 'minmax(260px, 1.4fr) minmax(150px, 0.6fr) auto';
}

export function buildUniqueFieldValues(dataStore: DataStore | null | undefined): Record<string, string[]> {
  if (!dataStore) return {};
  const items = dataStore.queryItems();
  const allKnownFields = new Set<string>(getAllFields(items));
  const valueMap: Record<string, Set<string>> = {};
  allKnownFields.forEach(field => valueMap[field] = new Set());

  for (const item of items) {
    for (const field of allKnownFields) {
      const value = readField(item, field);
      if (value === null || value === undefined || String(value).trim() === '') continue;
      const values = Array.isArray(value) ? value : [value];
      values.forEach(v => {
        const strV = String(v).trim();
        if (strV) valueMap[field].add(strV);
      });
    }
  }

  const result: Record<string, string[]> = {};
  for (const field in valueMap) {
    if (valueMap[field].size > 0) {
      result[field] = Array.from(valueMap[field]).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }
  }
  return result;
}
