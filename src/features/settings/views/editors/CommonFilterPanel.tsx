/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  TextField,
  Typography,
} from '@shared/ui/public';
import { RestartAltIcon } from '@shared/ui/public';
import type { DataStore } from '@core/services/public';
import type { FilterRule, RecordViewItem } from '@core/types/public';
import { getAllFields, readField } from '@core/types/public';
import { getFieldLabel } from '@core/fields/public';
import { normalizeViewFilters, normalizeViewFieldKey, normalizeViewMultiValue } from '@core/view/public';

interface QuickFilterField {
  field: string;
  label?: string;
  help?: string;
  placeholder?: string;
}

interface CommonFilterPanelProps {
  dataStore: DataStore;
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
  items?: RecordViewItem[];
  fieldOptions?: string[];
  title?: string;
  description?: string;
  fields?: QuickFilterField[];
  compact?: boolean;
}

const DEFAULT_QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { field: 'goalPath', label: '目标', help: '目标中心主筛选字段，优先用目标路径聚合任务/计划/总结/打卡。', placeholder: '选择目标' },
  { field: 'goalPaths', label: '目标列表', placeholder: '选择目标' },
  { field: 'goalId', label: '目标ID', help: '稳定目标 ID，适合目标实体化后的精确筛选。', placeholder: '输入目标ID' },
  { field: 'coreBlock', label: '记录类型', help: 'Goal × Block 主链字段，按 task/plan/review/thought/habit/evidence/blocker/milestone 筛选。旧分类筛选会自动归一到 coreBlock。', placeholder: '选择记录类型' },
  { field: 'themePath', label: '主题', help: '主题已降级为表单层级单选字段，但仍可用于上下文筛选。', placeholder: '选择主题' },
  { field: 'status', label: '状态', help: 'Task 使用显式 open/done/cancelled/skipped 状态。', placeholder: '选择状态' },
  { field: 'cadence', label: '任务周期', help: '由 Task Series 的结构化 recurrence 派生。', placeholder: '选择任务周期' },
  { field: 'priority', label: '优先级', placeholder: '选择优先级' },
  { field: 'period.label', label: '周期', help: '仅计划 / 总结类记录有周期。', placeholder: '选择周期' },
];


function collectFieldValues(items: RecordViewItem[], fields: string[]): Record<string, string[]> {
  const valueMap: Record<string, Set<string>> = {};
  fields.forEach(field => valueMap[normalizeViewFieldKey(field)] = new Set<string>());

  for (const item of items) {
    for (const rawField of fields) {
      const field = normalizeViewFieldKey(rawField);
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
  fields.forEach(rawField => {
    const field = normalizeViewFieldKey(rawField);
    result[field] = Array.from(valueMap[field] || []).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  });
  return result;
}

function cleanupRuleLinks(rules: FilterRule[]): FilterRule[] {
  return rules.map((rule, index) => {
    const nextRule: FilterRule = { ...rule };
    if (index === rules.length - 1) {
      delete (nextRule as any).logic;
    } else if (!nextRule.logic) {
      nextRule.logic = 'and';
    }
    return nextRule;
  });
}

function getQuickRule(filters: FilterRule[], field: string): FilterRule | undefined {
  const normalizedField = normalizeViewFieldKey(field);
  return filters.find(rule => normalizeViewFieldKey(rule.field) === normalizedField && rule.op === 'in');
}

function upsertQuickRule(filters: FilterRule[], field: string, values: string[]): FilterRule[] {
  const cleanValues = normalizeViewMultiValue(values);
  const normalizedField = normalizeViewFieldKey(field);
  const existingIndex = filters.findIndex(rule => normalizeViewFieldKey(rule.field) === normalizedField && rule.op === 'in');

  if (cleanValues.length === 0) {
    if (existingIndex < 0) return cleanupRuleLinks(filters);
    return cleanupRuleLinks(filters.filter((_, index) => index !== existingIndex));
  }

  if (existingIndex >= 0) {
    return cleanupRuleLinks(filters.map((rule, index) => (
      index === existingIndex ? { ...rule, field: normalizedField, value: cleanValues } : { ...rule }
    )));
  }

  return cleanupRuleLinks([
    ...filters.map(rule => ({ ...rule })),
    { field: normalizedField, op: 'in', value: cleanValues },
  ]);
}

function hasAnyQuickFilter(filters: FilterRule[], fields: QuickFilterField[]): boolean {
  const fieldSet = new Set(fields.map(f => normalizeViewFieldKey(f.field)));
  return filters.some(rule => fieldSet.has(normalizeViewFieldKey(rule.field)) && rule.op === 'in' && normalizeViewMultiValue(rule.value).length > 0);
}

function clearQuickFilters(filters: FilterRule[], fields: QuickFilterField[]): FilterRule[] {
  const fieldSet = new Set(fields.map(f => normalizeViewFieldKey(f.field)));
  return cleanupRuleLinks(filters.filter(rule => !(fieldSet.has(normalizeViewFieldKey(rule.field)) && rule.op === 'in')));
}

function describeQuickSummary(filters: FilterRule[], fields: QuickFilterField[]): string {
  const parts = fields
    .map(config => {
      const rule = getQuickRule(filters, config.field);
      const values = normalizeViewMultiValue(rule?.value);
      if (values.length === 0) return '';
      const label = config.label || getFieldLabel(config.field);
      return `${label}为${values.join('或')}`;
    })
    .filter(Boolean);

  return parts.length > 0 ? `当前显示：${parts.join('，并且')}。` : '未设置常用筛选。';
}

export function CommonFilterPanel({
  dataStore,
  filters,
  onChange,
  items,
  fieldOptions,
  title = '常用筛选',
  description = '适合主题路径、分类、目标这类高频筛选；同一字段内是“或”，不同字段之间是“且”。',
  fields = DEFAULT_QUICK_FILTER_FIELDS,
  compact = false,
}: CommonFilterPanelProps) {
  const sourceItems = useMemo(() => items ?? dataStore.queryItems(), [items, dataStore]);
  const availableFields = useMemo(() => new Set((fieldOptions ?? getAllFields(sourceItems)).map(normalizeViewFieldKey)), [fieldOptions, sourceItems]);
  const quickFields = useMemo(
    () => fields
      .map(config => ({ ...config, field: normalizeViewFieldKey(config.field) }))
      .filter((config, index, array) => config.field && availableFields.has(config.field) && array.findIndex(item => item.field === config.field) === index),
    [fields, availableFields]
  );
  const valueOptions = useMemo(
    () => collectFieldValues(sourceItems, quickFields.map(config => config.field)),
    [sourceItems, quickFields]
  );
  const hasQuickFilters = hasAnyQuickFilter(filters, quickFields);
  const summary = describeQuickSummary(filters, quickFields);

  if (quickFields.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        p: compact ? 1.25 : 1.5,
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '10px',
        background: 'var(--background-secondary)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <div>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </div>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => onChange(clearQuickFilters(filters, quickFields))}
          disabled={!hasQuickFilters}
          sx={{ whiteSpace: 'nowrap' }}
        >
          清空常用
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 1.25,
        }}
      >
        {quickFields.map(config => {
          const label = config.label || getFieldLabel(config.field);
          const rule = getQuickRule(filters, config.field);
          const values = normalizeViewMultiValue(rule?.value);

          return (
            <Box key={config.field} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
              <Autocomplete
                multiple
                freeSolo
                fullWidth
                size="small"
                disablePortal
                options={valueOptions[normalizeViewFieldKey(config.field)] || []}
                value={values}
                onChange={(_, newValue: string[]) => onChange(upsertQuickRule(filters, config.field, newValue))}
                renderTags={(tagValue: string[], getTagProps: any) =>
                  tagValue.map((option: string, index: number) => (
                    <Chip {...getTagProps({ index })} key={`${config.field}-${option}`} label={option} size="small" />
                  ))
                }
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder={values.length > 0 ? '' : (config.placeholder || `选择${label}`)}
                    helperText={compact ? undefined : config.help}
                  />
                )}
              />
            </Box>
          );
        })}
      </Box>

      <Typography variant="body2" color="text.secondary">{summary}</Typography>
    </Box>
  );
}
