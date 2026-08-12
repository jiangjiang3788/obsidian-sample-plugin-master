import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ViewFieldOrderContext, GroupNode } from '@/core/utils/itemGrouping';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { dayjs } from '@/core/utils/date';
import { filterByKeyword, filterByPeriod, filterByRules, sortItems } from '@/core/utils/itemFilter';
import { groupItemsByFields } from '@/core/utils/itemGrouping';
import { isSameIsoWeek, toIsoDateTuple } from '@/core/utils/timelineRange';

export type RecordQueryDateMode = 'standard' | 'overview' | 'strict';

export interface RecordQueryDateConstraint {
  range: [Date, Date];
  /** Canonical/default date field. Custom time/date fields use strict mode by default. */
  field?: string;
  mode?: RecordQueryDateMode;
  /** Used by period-aware overview/standard views (年/季/月/周/天). */
  granularity?: string;
  useFieldGranularity?: boolean;
  /** Optional explicit period rule from the view configuration. */
  periodValue?: unknown;
  /** Event-like fields are compared at minute precision; default date uses day precision. */
  precision?: 'day' | 'minute';
}

export interface RecordQuerySpec {
  /** Each rule group is evaluated independently; groups are combined with AND. */
  filterGroups?: ReadonlyArray<readonly FilterRule[]>;
  keyword?: string;
  date?: RecordQueryDateConstraint;
  sort?: readonly SortRule[];
  groupBy?: readonly string[];
  groupContext?: ViewFieldOrderContext;
}

export interface RecordQueryResult {
  items: RecordViewItem[];
  groupTree: GroupNode[] | null;
}

function isClosedTask(item: RecordViewItem): boolean {
  if (item.coreBlock !== 'task') return false;
  return item.status === 'done' || item.status === 'cancelled' || item.status === 'skipped';
}

function itemGranularity(item: RecordViewItem): string {
  return String(readField(item, 'period') || '天');
}

function isWithinDayRange(value: unknown, range: [Date, Date]): boolean {
  if (!value) return false;
  const parsed = dayjs(value as string | number | Date);
  if (!parsed.isValid()) return false;
  const [start, end] = toIsoDateTuple({
    start: dayjs(range[0]).startOf('day'),
    end: dayjs(range[1]).endOf('day'),
  });
  const valueMs = parsed.valueOf();
  return valueMs >= dayjs(start).startOf('day').valueOf()
    && valueMs <= dayjs(end).endOf('day').valueOf();
}

function isWithinMinuteRange(value: unknown, range: [Date, Date]): boolean {
  if (!value) return false;
  const parsed = dayjs(value as string | number | Date);
  if (!parsed.isValid()) return false;
  const startMs = dayjs(range[0]).valueOf();
  const endMs = dayjs(range[1]).valueOf();
  const valueMs = parsed.valueOf();
  return valueMs >= startMs && valueMs <= endMs;
}

function applyStrictDateConstraint(
  items: RecordViewItem[],
  constraint: RecordQueryDateConstraint,
): RecordViewItem[] {
  const field = constraint.field || 'date';
  const inRange = constraint.precision === 'minute' ? isWithinMinuteRange : isWithinDayRange;
  return items.filter((item) => inRange(readField(item, field), constraint.range));
}

function applyOverviewDateConstraint(
  items: RecordViewItem[],
  constraint: RecordQueryDateConstraint,
): RecordViewItem[] {
  const contextDate = dayjs(constraint.range[1]);
  const field = constraint.field || 'date';

  return items.filter((item) => {
    const rawDate = readField(item, field);
    if (!rawDate) return field === 'date' ? !isClosedTask(item) : false;

    const itemDate = dayjs(rawDate as string | number | Date);
    if (!itemDate.isValid()) return field === 'date' ? !isClosedTask(item) : false;

    if (constraint.useFieldGranularity) {
      switch (itemGranularity(item)) {
        case '年': return itemDate.isSame(contextDate, 'year');
        case '季': return itemDate.isSame(contextDate, 'quarter');
        case '月': return itemDate.isSame(contextDate, 'month');
        case '周': return isSameIsoWeek(itemDate, contextDate);
        default: return isWithinDayRange(rawDate, constraint.range);
      }
    }

    return isWithinDayRange(rawDate, constraint.range);
  });
}

function applyStandardDateConstraint(
  items: RecordViewItem[],
  constraint: RecordQueryDateConstraint,
): RecordViewItem[] {
  const field = constraint.field || 'date';
  if (field !== 'date') return applyStrictDateConstraint(items, { ...constraint, mode: 'strict' });

  let result = items;
  const period = constraint.periodValue ?? (constraint.useFieldGranularity ? constraint.granularity : undefined);
  if (period != null && String(period).trim()) result = filterByPeriod(result, String(period));

  return result.filter((item) => {
    const rawDate = readField(item, field);
    if (!rawDate) return !isClosedTask(item);
    const parsed = dayjs(rawDate as string | number | Date);
    if (!parsed.isValid()) return !isClosedTask(item);
    return isWithinDayRange(rawDate, constraint.range);
  });
}

function applyDateConstraint(items: RecordViewItem[], constraint?: RecordQueryDateConstraint): RecordViewItem[] {
  if (!constraint) return items;
  const mode = constraint.mode || ((constraint.field && constraint.field !== 'date') ? 'strict' : 'standard');
  if (mode === 'overview') return applyOverviewDateConstraint(items, constraint);
  if (mode === 'strict') return applyStrictDateConstraint(items, constraint);
  return applyStandardDateConstraint(items, constraint);
}

/**
 * Canonical Record query engine.
 *
 * It owns selection semantics (filter/keyword/date/sort/group). View models are expected
 * to consume the result and focus on presentation/aggregation rather than reimplementing
 * Record filtering rules.
 */
export function executeRecordQuery(items: RecordViewItem[], spec: RecordQuerySpec = {}): RecordQueryResult {
  let result = items;

  for (const group of spec.filterGroups || []) {
    if (group.length) result = filterByRules(result, [...group]);
  }

  if (spec.keyword) result = filterByKeyword(result, spec.keyword);
  result = applyDateConstraint(result, spec.date);
  if (spec.sort?.length) result = sortItems(result, [...spec.sort]);

  const groupFields = (spec.groupBy || []).filter(Boolean);
  const groupTree = groupFields.length
    ? groupItemsByFields(result, [...groupFields], spec.groupContext)
    : null;

  return { items: result, groupTree };
}

export function queryRecordItems(items: RecordViewItem[], spec: RecordQuerySpec = {}): RecordViewItem[] {
  return executeRecordQuery(items, spec).items;
}
