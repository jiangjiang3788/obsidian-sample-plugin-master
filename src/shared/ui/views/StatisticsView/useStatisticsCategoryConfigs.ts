// src/shared/ui/views/StatisticsView/useStatisticsCategoryConfigs.ts
import { useEffect, useMemo } from 'preact/hooks';
import type { Item } from '@core/types/public';
import type { CategoryConfig } from '@core/view/public';
import { discoverBaseCategories, getBasePath } from '@core/utils/public';
import { generateCategoryColor, getCategoryColor } from '@core/types/public';
import type { CategoryColorMap, UpdateCategoryColorsHandler } from '../../../types/actions';

export interface UseStatisticsCategoryConfigsParams {
  items: Item[];
  configuredCategories: CategoryConfig[];
  selectedCategories?: string[];
  categoryColors: CategoryColorMap;
  onCategoryColorsChange?: UpdateCategoryColorsHandler;
  injectedFilteredCategories?: CategoryConfig[];
}

export function useStatisticsCategoryConfigs({
  items,
  configuredCategories,
  selectedCategories,
  categoryColors,
  onCategoryColorsChange,
  injectedFilteredCategories,
}: UseStatisticsCategoryConfigsParams): CategoryConfig[] {
  // 自动发现 items 中的新分类，为其生成颜色并通过上层持久化到 store。
  // shared/ui 不直接订阅 app store，只依赖注入的颜色映射和更新回调。
  useEffect(() => {
    const discovered = discoverBaseCategories(items);
    const newColors: Record<string, string> = {};
    let hasNew = false;
    for (const name of discovered) {
      if (!categoryColors[name]) {
        newColors[name] = generateCategoryColor(name);
        hasNew = true;
      }
    }
    if (hasNew) {
      void onCategoryColorsChange?.({ ...categoryColors, ...newColors });
    }
  }, [items, categoryColors, onCategoryColorsChange]);

  const categoryConfigs = useMemo(() => {
    const discovered = discoverBaseCategories(items);

    if (configuredCategories.length > 0) {
      const result: CategoryConfig[] = [];
      const seen = new Set<string>();

      for (const cat of configuredCategories) {
        const baseName = getBasePath(cat.name) || cat.name || '';
        if (!baseName || seen.has(baseName)) continue;
        seen.add(baseName);
        result.push({
          ...cat,
          name: baseName,
          alias: cat.alias && cat.alias !== baseName ? cat.alias : undefined,
          color: categoryColors[baseName] || getCategoryColor(baseName),
        });
      }

      for (const name of discovered) {
        const baseName = getBasePath(name) || name;
        if (!baseName || seen.has(baseName)) continue;
        seen.add(baseName);
        result.push({
          name: baseName,
          color: categoryColors[baseName] || getCategoryColor(baseName),
          files: [],
        });
      }

      return result;
    }

    return discovered.map(name => ({
      name,
      color: categoryColors[name] || getCategoryColor(name),
      files: [],
    }));
  }, [configuredCategories, items, categoryColors]);

  return useMemo(() => {
    if (injectedFilteredCategories) return injectedFilteredCategories;
    if (!selectedCategories || selectedCategories.length === 0) return categoryConfigs;
    return categoryConfigs.filter((category) => selectedCategories.includes(category.name));
  }, [categoryConfigs, injectedFilteredCategories, selectedCategories]);
}
