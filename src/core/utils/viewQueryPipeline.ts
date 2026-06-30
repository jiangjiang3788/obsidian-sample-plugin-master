import type { FilterRule, Item, SortRule } from '../types/schema';
import { dayjs } from './date';
import { filterByDateRange, filterByKeyword, filterByPeriod, filterByRules, sortItems } from './itemFilter';
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
}

function getItemGranularity(item: Item): string {
  return (item as any).period || '天';
}

function isClosedItem(item: Item): boolean {
  return /\/(done|cancelled)\b/.test((item.categoryKey || '').toLowerCase());
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

export function applyViewBaseFilters(input: Pick<ViewQueryInput, 'items' | 'layoutFilters' | 'viewFilters' | 'keyword'>): Item[] {
  const layoutFilters = input.layoutFilters || [];
  const viewFilters = input.viewFilters || [];

  let result = input.items;

  result = filterByRules(result, layoutFilters);
  result = filterByRules(result, viewFilters);
  result = filterByKeyword(result, input.keyword || '');

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
