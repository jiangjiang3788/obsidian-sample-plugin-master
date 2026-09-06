import type { FilterRule, SortRule } from '@/core/view/ViewConfig';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ViewFieldOrderContext, GroupNode } from '@/core/utils/itemGrouping';
import { readField } from '@/core/fields/ViewFieldCatalog';
import { dayjs } from '@/core/utils/date';
import { filterByKeyword, filterByPeriod, filterByRules, sortItems } from '@/core/utils/itemFilter';
import { groupItemsByFields } from '@/core/utils/itemGrouping';
import { isSameIsoWeek, toIsoDateTuple } from '@/core/utils/timelineRange';
import { normalizeViewDateRole, type ViewDateRole } from '@/core/view-config/dateRole';

export type RecordQueryDateMode = 'standard' | 'overview' | 'strict';
export type RecordQueryDateRole = ViewDateRole;

/** @deprecated Prefer normalizeViewDateRole for view configuration code. */
export const normalizeRecordQueryDateRole = normalizeViewDateRole;

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
  /** Explicit Task date fact. Non-default roles are always strict and never keep open Tasks outside range. */
  role?: RecordQueryDateRole;
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

function isOpenTask(item: RecordViewItem): boolean {
  return item.coreBlock === 'task' && !isClosedTask(item);
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


function readDateConstraintValue(item: RecordViewItem, constraint: RecordQueryDateConstraint): unknown {
  const role = constraint.role || 'default';
  if (role === 'task-scheduled') {
    return item.coreBlock === 'task' ? (item.scheduledAt ?? item.scheduledDate) : undefined;
  }
  if (role === 'task-due') {
    return item.coreBlock === 'task' ? (item.dueAt ?? item.dueDate) : undefined;
  }
  if (role === 'task-completed') {
    return item.coreBlock === 'task' ? (item.completedAt ?? item.doneDate) : undefined;
  }
  if (role === 'task-actual') {
    return item.coreBlock === 'task-session' ? item.sessionStartedAt : undefined;
  }
  return readField(item, constraint.field || 'date');
}

function applyStrictDateConstraint(
  items: RecordViewItem[],
  constraint: RecordQueryDateConstraint,
): RecordViewItem[] {
  const inRange = constraint.precision === 'minute' ? isWithinMinuteRange : isWithinDayRange;
  return items.filter((item) => inRange(readDateConstraintValue(item, constraint), constraint.range));
}

function applyOverviewDateConstraint(
  items: RecordViewItem[],
  constraint: RecordQueryDateConstraint,
): RecordViewItem[] {
  const contextDate = dayjs(constraint.range[1]);
  const field = constraint.field || 'date';

  return items.filter((item) => {
    // The default layout period describes Record occurrence history. An open Task is
    // a live entity, so a past scheduled/start/due date must not make it disappear.
    // Explicit task-date queries still use strict mode and therefore remain date-bound.
    if (field === 'date' && isOpenTask(item)) return true;
    const rawDate = readDateConstraintValue(item, constraint);
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
    if (isOpenTask(item)) return true;
    const rawDate = readDateConstraintValue(item, constraint);
    if (!rawDate) return !isClosedTask(item);
    const parsed = dayjs(rawDate as string | number | Date);
    if (!parsed.isValid()) return !isClosedTask(item);
    return isWithinDayRange(rawDate, constraint.range);
  });
}

function applyDateConstraint(items: RecordViewItem[], constraint?: RecordQueryDateConstraint): RecordViewItem[] {
  if (!constraint) return items;
  const explicitRole = (constraint.role || 'default') !== 'default';
  const mode = explicitRole
    ? 'strict'
    : (constraint.mode || ((constraint.field && constraint.field !== 'date') ? 'strict' : 'standard'));
  if (mode === 'overview') return applyOverviewDateConstraint(items, constraint);
  if (mode === 'strict') return applyStrictDateConstraint(items, constraint);
  return applyStandardDateConstraint(items, constraint);
}

// Layout dashboards often render several views over the same immutable RecordViewItem[]
// snapshot. Date filtering is the expensive shared part because it parses thousands of
// date values. Cache it by source-array identity + date policy so sibling views reuse the
// same period selection instead of repeating the full scan.
const dateConstraintCache = new WeakMap<RecordViewItem[], Map<string, RecordViewItem[]>>();
const MAX_DATE_CACHE_ENTRIES_PER_SNAPSHOT = 48;

function buildDateConstraintCacheKey(constraint: RecordQueryDateConstraint): string {
  const [start, end] = constraint.range;
  return JSON.stringify({
    start: start?.getTime?.() ?? Number(start),
    end: end?.getTime?.() ?? Number(end),
    field: constraint.field || 'date',
    mode: constraint.mode || '',
    granularity: constraint.granularity || '',
    useFieldGranularity: !!constraint.useFieldGranularity,
    periodValue: constraint.periodValue == null ? '' : String(constraint.periodValue),
    precision: constraint.precision || 'day',
    role: constraint.role || 'default',
  });
}

function applyDateConstraintCached(items: RecordViewItem[], constraint?: RecordQueryDateConstraint): RecordViewItem[] {
  if (!constraint) return items;
  let byConstraint = dateConstraintCache.get(items);
  if (!byConstraint) {
    byConstraint = new Map<string, RecordViewItem[]>();
    dateConstraintCache.set(items, byConstraint);
  }
  const key = buildDateConstraintCacheKey(constraint);
  const cached = byConstraint.get(key);
  if (cached) return cached;
  const filtered = applyDateConstraint(items, constraint);
  byConstraint.set(key, filtered);
  if (byConstraint.size > MAX_DATE_CACHE_ENTRIES_PER_SNAPSHOT) {
    const oldestKey = byConstraint.keys().next().value as string | undefined;
    if (oldestKey) byConstraint.delete(oldestKey);
  }
  return filtered;
}

/**
 * Canonical Record query engine.
 *
 * It owns selection semantics (filter/keyword/date/sort/group). View models are expected
 * to consume the result and focus on presentation/aggregation rather than reimplementing
 * Record filtering rules.
 */
export function executeRecordQuery(items: RecordViewItem[], spec: RecordQuerySpec = {}): RecordQueryResult {
  // Date, rule and keyword filters are all pure selections, so their order does not
  // change the result. Apply the shared date selection first so dashboard sibling views
  // can reuse it through the source-array cache above.
  let result = applyDateConstraintCached(items, spec.date);

  for (const group of spec.filterGroups || []) {
    if (group.length) result = filterByRules(result, [...group]);
  }

  if (spec.keyword) result = filterByKeyword(result, spec.keyword);
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
