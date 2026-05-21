import type { FilterRule, Layout } from '../types/schema';
import { getBasePath } from './pathSemantic';

/**
 * Layout 级筛选适配器
 * -----------------------------------------------------------------------------
 * 目标：把旧版 toolbar 的 selectedThemes / selectedCategories 适配为 FilterRule[]。
 * 这样 LayoutRenderer、useViewData、特殊 viewModel 不需要各自理解旧字段。
 */
export type LegacyLayoutFilterFields = Pick<Layout, 'selectedThemes' | 'selectedCategories'>;
export type LayoutFilterFields = Pick<Layout, 'globalFilters' | 'selectedThemes' | 'selectedCategories'>;

export interface LegacyLayoutFilterState {
  /** Layout 是否还没有 globalFilters 字段，仍处于旧字段兼容读取模式。 */
  isLegacyMode: boolean;
  /** 旧字段里是否真的有筛选值。 */
  hasLegacyValues: boolean;
  selectedThemes: string[];
  selectedCategories: string[];
  effectiveFilters: FilterRule[];
}

export function buildLegacyLayoutFilters(layout: LegacyLayoutFilterFields): FilterRule[] {
  const rules: FilterRule[] = [];
  const selectedThemes = layout.selectedThemes || [];
  const selectedCategories = layout.selectedCategories || [];

  if (selectedThemes.length > 0) {
    rules.push({
      field: 'themePath',
      op: 'in',
      value: selectedThemes,
      logic: selectedCategories.length > 0 ? 'and' : undefined,
    });
  }

  if (selectedCategories.length > 0) {
    rules.push({
      field: 'baseCategory',
      op: 'in',
      value: selectedCategories,
    });
  }

  return rules;
}

/**
 * 判断 Layout 是否已经显式进入新版全局筛选。
 * 注意：空数组也是显式新版状态，表示用户主动清空了筛选，不能再回退旧字段。
 */
export function hasExplicitGlobalFilters(layout: Pick<Layout, 'globalFilters'>): boolean {
  return Array.isArray(layout.globalFilters);
}

export function hasLegacyLayoutFilterValues(layout: LegacyLayoutFilterFields): boolean {
  return (layout.selectedThemes || []).length > 0 || (layout.selectedCategories || []).length > 0;
}

export function getLegacyLayoutFilterState(layout: LayoutFilterFields): LegacyLayoutFilterState {
  const isLegacyMode = !hasExplicitGlobalFilters(layout);
  const selectedThemes = layout.selectedThemes || [];
  const selectedCategories = layout.selectedCategories || [];

  return {
    isLegacyMode,
    hasLegacyValues: hasLegacyLayoutFilterValues(layout),
    selectedThemes,
    selectedCategories,
    effectiveFilters: isLegacyMode ? buildLegacyLayoutFilters(layout) : (layout.globalFilters || []),
  };
}

/**
 * 当前 Layout 实际生效的全局筛选规则。
 * 新版 globalFilters 优先；只有旧数据没有 globalFilters 字段时才回退 legacy 字段。
 */
export function getEffectiveLayoutFilters(layout: LayoutFilterFields): FilterRule[] {
  return getLegacyLayoutFilterState(layout).effectiveFilters;
}

/**
 * 显式迁移旧 toolbar 筛选字段。
 * - 把旧字段转换成 globalFilters
 * - 清空 selectedThemes / selectedCategories，避免双写和误读
 */
export function migrateLegacyLayoutFilters(layout: LayoutFilterFields): Pick<Layout, 'globalFilters' | 'selectedThemes' | 'selectedCategories'> {
  return {
    globalFilters: getEffectiveLayoutFilters(layout),
    selectedThemes: [],
    selectedCategories: [],
  };
}

export function describeLegacyLayoutFilters(layout: LegacyLayoutFilterFields): string {
  const parts: string[] = [];
  const selectedThemes = layout.selectedThemes || [];
  const selectedCategories = layout.selectedCategories || [];

  if (selectedThemes.length > 0) parts.push(`主题 ${selectedThemes.length} 项`);
  if (selectedCategories.length > 0) parts.push(`分类 ${selectedCategories.length} 项`);
  return parts.join('，');
}

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
