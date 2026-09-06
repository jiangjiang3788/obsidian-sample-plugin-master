import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { executeRecordQuery, type RecordQueryDateMode, type RecordQueryDateRole, type RecordQuerySpec } from './RecordQuery';

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
  /** Optional explicit date fact for views such as planned/due/completed/actual history. */
  dateRole?: RecordQueryDateRole;
  dateField?: string;
  dateMode?: RecordQueryDateMode;
  datePrecision?: 'day' | 'minute';
}

export function buildViewRecordQuery(input: ViewRecordQueryInput): RecordQuerySpec {
  const periodFilter = (input.viewFilters || []).find((rule) => rule.field === 'period');
  return {
    filterGroups: [input.layoutFilters || [], input.viewFilters || []],
    keyword: input.keyword || '',
    sort: input.sort || [],
    date: {
      range: input.dateRange,
      field: input.dateField || 'date',
      role: input.dateRole || 'default',
      mode: input.dateMode || (input.isOverviewMode ? 'overview' : 'standard'),
      granularity: input.layoutView,
      useFieldGranularity: !!input.useFieldGranularity,
      periodValue: periodFilter?.value,
      precision: input.datePrecision || 'day',
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
