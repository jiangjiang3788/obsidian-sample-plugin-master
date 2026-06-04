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
} from '@mui/material';
import { RestartAltIcon } from '@shared/public';
import type { DataStore, FilterRule, Item } from '@core/public';
import { getAllFields, getFieldLabel, readField } from '@core/public';

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
  items?: Item[];
  fieldOptions?: string[];
  title?: string;
  description?: string;
  fields?: QuickFilterField[];
  compact?: boolean;
}

const DEFAULT_QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { field: 'themePath', label: '主题路径', help: '使用完整 themePath 筛选，例如 生活/健康；不再用根主题或章节标题兜底。', placeholder: '选择主题路径' },
  { field: 'baseCategory', label: '分类', help: '不同字段之间默认表示“且”：主题匹配后还要分类匹配。', placeholder: '选择分类' },
  { field: 'tags', label: '标签', placeholder: '选择标签' },
  { field: 'type', label: '类型', placeholder: '选择记录类型' },
  { field: 'priority', label: '优先级', placeholder: '选择优先级' },
  { field: 'period', label: '时间粒度', placeholder: '选择粒度' },
];

function normalizeMultiValue(value: any): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = rawValues
    .flatMap(v => String(v ?? '').split(/[,，\n]/))
    .map(part => part.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function collectFieldValues(items: Item[], fields: string[]): Record<string, string[]> {
  const valueMap: Record<string, Set<string>> = {};
  fields.forEach(field => valueMap[field] = new Set<string>());

  for (const item of items) {
    for (const field of fields) {
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
  fields.forEach(field => {
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
  return filters.find(rule => rule.field === field && rule.op === 'in');
}

function upsertQuickRule(filters: FilterRule[], field: string, values: string[]): FilterRule[] {
  const cleanValues = normalizeMultiValue(values);
  const existingIndex = filters.findIndex(rule => rule.field === field && rule.op === 'in');

  if (cleanValues.length === 0) {
    if (existingIndex < 0) return cleanupRuleLinks(filters);
    return cleanupRuleLinks(filters.filter((_, index) => index !== existingIndex));
  }

  if (existingIndex >= 0) {
    return cleanupRuleLinks(filters.map((rule, index) => (
      index === existingIndex ? { ...rule, value: cleanValues } : { ...rule }
    )));
  }

  return cleanupRuleLinks([
    ...filters.map(rule => ({ ...rule })),
    { field, op: 'in', value: cleanValues },
  ]);
}

function hasAnyQuickFilter(filters: FilterRule[], fields: QuickFilterField[]): boolean {
  const fieldSet = new Set(fields.map(f => f.field));
  return filters.some(rule => fieldSet.has(rule.field) && rule.op === 'in' && normalizeMultiValue(rule.value).length > 0);
}

function clearQuickFilters(filters: FilterRule[], fields: QuickFilterField[]): FilterRule[] {
  const fieldSet = new Set(fields.map(f => f.field));
  return cleanupRuleLinks(filters.filter(rule => !(fieldSet.has(rule.field) && rule.op === 'in')));
}

function describeQuickSummary(filters: FilterRule[], fields: QuickFilterField[]): string {
  const parts = fields
    .map(config => {
      const rule = getQuickRule(filters, config.field);
      const values = normalizeMultiValue(rule?.value);
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
  description = '适合主题路径、分类、标签这类高频筛选；同一字段内是“或”，不同字段之间是“且”。',
  fields = DEFAULT_QUICK_FILTER_FIELDS,
  compact = false,
}: CommonFilterPanelProps) {
  const sourceItems = useMemo(() => items ?? dataStore.queryItems(), [items, dataStore]);
  const availableFields = useMemo(() => new Set(fieldOptions ?? getAllFields(sourceItems)), [fieldOptions, sourceItems]);
  const quickFields = useMemo(
    () => fields.filter(config => availableFields.has(config.field)),
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
          const values = normalizeMultiValue(rule?.value);

          return (
            <Box key={config.field} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
              <Autocomplete
                multiple
                freeSolo
                fullWidth
                size="small"
                disablePortal
                options={valueOptions[config.field] || []}
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
