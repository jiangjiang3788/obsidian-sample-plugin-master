import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { executeRecordQuery, type RecordQuerySpec } from './RecordQuery';

export interface ViewRecordQueryInput {
  items: RecordViewItem[];
  layoutFilters?: FilterRule[];
  viewFilters?: FilterRule[];
  sort?: SortRule[];
  keyword?: string;
  dateRange: [Date, Date];
  layoutView: string;
  isOverviewMode?: boolean;
  useFieldGranularity?: boolean;
}

export function buildViewRecordQuery(input: ViewRecordQueryInput): RecordQuerySpec {
  const periodFilter = (input.viewFilters || []).find((rule) => rule.field === 'period');
  return {
    filterGroups: [input.layoutFilters || [], input.viewFilters || []],
    keyword: input.keyword || '',
    sort: input.sort || [],
    date: {
      range: input.dateRange,
      field: 'date',
      mode: input.isOverviewMode ? 'overview' : 'standard',
      granularity: input.layoutView,
      useFieldGranularity: !!input.useFieldGranularity,
      periodValue: periodFilter?.value,
    },
  };
}

export function queryViewRecords(input: ViewRecordQueryInput): RecordViewItem[] {
  return executeRecordQuery(input.items, buildViewRecordQuery(input)).items;
}

export function queryViewBaseRecords(
  input: Pick<ViewRecordQueryInput, 'items' | 'layoutFilters' | 'viewFilters' | 'keyword'>,
): RecordViewItem[] {
  return executeRecordQuery(input.items, {
    filterGroups: [input.layoutFilters || [], input.viewFilters || []],
    keyword: input.keyword || '',
  }).items;
}
