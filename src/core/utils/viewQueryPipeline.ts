import type { FilterRule, Item, SortRule } from '../types/schema';
import { dayjs } from './date';
import { filterByDateRange, filterByKeyword, filterByPeriod, filterByRules, sortItems } from './itemFilter';
import { getBasePath } from './pathSemantic';
import { isSameIsoWeek, toIsoDateTuple } from './timelineRange';

export interface ViewQueryInput {
  items: Item[];
  layoutFilters?: FilterRule[];
  viewFilters?: FilterRule[];
  sort?: SortRule[];
  keyword?: string;
  dateRange: [Date, Date];
  layoutView: string;
  isOverviewMode?: boolean;
  useFieldGranularity?: boolean;
  legacySelectedThemes?: string[];
  legacySelectedCategories?: string[];
}

function getItemGranularity(item: Item): string {
  return (item as any).period || '天';
}

function isClosedItem(item: Item): boolean {
  return /\/(done|cancelled)\b/.test((item.categoryKey || '').toLowerCase());
}

function applyLegacyThemeFilter(items: Item[], selectedThemes: string[] = []): Item[] {
  if (!selectedThemes.length) return items;
  return items.filter(item => {
    const theme = item.themePath || item.theme || (item as any).themePathNormalized;
    return !!theme && selectedThemes.includes(theme);
  });
}

function applyLegacyCategoryFilter(items: Item[], selectedCategories: string[] = []): Item[] {
  if (!selectedCategories.length) return items;
  return items.filter(item => selectedCategories.includes(getBasePath(item.categoryKey)));
}

function applyOverviewDateFilter(items: Item[], dateRange: [Date, Date], useFieldGranularity: boolean): Item[] {
  const [start, end] = toIsoDateTuple({
    start: dayjs(dateRange[0]).startOf('day'),
    end: dayjs(dateRange[1]).endOf('day'),
  });
  const contextDate = dayjs(dateRange[1]);

  return items.filter(item => {
    const itemDate = item.date ? dayjs(item.date) : null;

    if (!itemDate || !itemDate.isValid()) {
      return !isClosedItem(item);
    }

    if (useFieldGranularity) {
      const itemGranularity = getItemGranularity(item);
      switch (itemGranularity) {
        case '年':
          return itemDate.isSame(contextDate, 'year');
        case '季':
          return itemDate.isSame(contextDate, 'quarter');
        case '月':
          return itemDate.isSame(contextDate, 'month');
        case '周':
          return isSameIsoWeek(itemDate, contextDate);
        default: {
          const itemMs = itemDate.valueOf();
          const startMs = dayjs(start).startOf('day').valueOf();
          const endMs = dayjs(end).endOf('day').valueOf();
          return itemMs >= startMs && itemMs <= endMs;
        }
      }
    }

    const itemMs = itemDate.valueOf();
    const startMs = dayjs(start).startOf('day').valueOf();
    const endMs = dayjs(end).endOf('day').valueOf();
    return itemMs >= startMs && itemMs <= endMs;
  });
}

function applyStandardDateAndGranularityFilter(
  items: Item[],
  dateRange: [Date, Date],
  layoutView: string,
  viewFilters: FilterRule[],
  useFieldGranularity: boolean,
): Item[] {
  const [start, end] = toIsoDateTuple({
    start: dayjs(dateRange[0]).startOf('day'),
    end: dayjs(dateRange[1]).endOf('day'),
  });

  const periodFilter = viewFilters.find(f => f.field === 'period');
  let result = items;

  if (periodFilter) {
    result = filterByPeriod(result, periodFilter.value);
  } else if (useFieldGranularity) {
    result = filterByPeriod(result, layoutView);
  }

  return filterByDateRange(result, start, end);
}

export function applyViewBaseFilters(input: Pick<ViewQueryInput, 'items' | 'layoutFilters' | 'viewFilters' | 'keyword' | 'legacySelectedThemes' | 'legacySelectedCategories'>): Item[] {
  const layoutFilters = input.layoutFilters || [];
  const viewFilters = input.viewFilters || [];

  let result = input.items;

  result = filterByRules(result, layoutFilters);
  result = filterByRules(result, viewFilters);
  result = filterByKeyword(result, input.keyword || '');

  // 只有没有新版 layoutFilters 时才执行 legacy 字段，避免同一批主题/分类被重复 AND。
  if (layoutFilters.length === 0) {
    result = applyLegacyThemeFilter(result, input.legacySelectedThemes || []);
    result = applyLegacyCategoryFilter(result, input.legacySelectedCategories || []);
  }

  return result;
}

export function applyViewQueryPipeline(input: ViewQueryInput): Item[] {
  const viewFilters = input.viewFilters || [];
  const sort = input.sort || [];

  let result = applyViewBaseFilters(input);

  if (input.isOverviewMode) {
    result = applyOverviewDateFilter(result, input.dateRange, !!input.useFieldGranularity);
  } else {
    result = applyStandardDateAndGranularityFilter(
      result,
      input.dateRange,
      input.layoutView,
      viewFilters,
      !!input.useFieldGranularity,
    );
  }

  return sortItems(result, sort);
}
