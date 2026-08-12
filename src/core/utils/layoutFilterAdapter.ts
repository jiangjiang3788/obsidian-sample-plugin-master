import type { FilterRule } from '@/core/view/ViewConfig';
import { getBasePath } from './pathSemantic';

function asStringList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return String(value)
    .split(/[,，]/)
    .map(v => v.trim())
    .filter(Boolean);
}

/**
 * 从 FilterRule[] 中提取分类选择，用于 Statistics 等“配置类别列表”的展示收敛。
 * 这里只处理明确的 baseCategory/categoryKey 等值规则，不尝试解释 regex / range。
 */
export function getCategoryValuesFromFilters(filters: FilterRule[] = []): string[] {
  const result = new Set<string>();

  for (const rule of filters) {
    if (!['baseCategory', 'categoryKey', '类别', '根类别'].includes(rule.field)) continue;
    if (!['=', 'includes', 'in'].includes(rule.op)) continue;
    for (const value of asStringList(rule.value)) {
      result.add(rule.field === 'categoryKey' || rule.field === '类别' ? getBasePath(value) : value);
    }
  }

  return Array.from(result);
}
