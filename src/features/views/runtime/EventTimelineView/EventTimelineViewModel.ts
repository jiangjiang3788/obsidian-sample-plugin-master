import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem, ViewInstance } from '@core/types/public';
import type { GroupNode } from '@core/utils/public';
import { executeRecordQuery } from '@core/view/public';
import { normalizeDisplayFields } from '@core/view/public';
import { readField } from '@core/types/public';
import { dayjs } from '@core/utils/public';

export interface EventTimelineViewConfig {
  timeField: string;
  titleField: string;
  contentField: string;
  maxContentLength: number;
}

export interface EventTimelineRenderModel {
  displayFields: string[];
  groupFields: string[];
  viewConfig: EventTimelineViewConfig;
  filteredItems: RecordViewItem[];
  groupedTree: GroupNode[] | null;
}

export function buildEventTimelineDisplayFields(module: ViewInstance): string[] {
  return normalizeDisplayFields(module.fields || ['title', 'date'], { fallbackFields: ['title', 'date'] });
}

export function buildEventTimelineGroupFields(module: ViewInstance): string[] {
  return normalizeDisplayFields(module.groupFields || []);
}

export function buildEventTimelineViewConfig(module: ViewInstance): EventTimelineViewConfig {
  const viewConfig = (module.viewConfig as any) || {};
  return {
    timeField: viewConfig.timeField || 'date',
    titleField: viewConfig.titleField || 'title',
    contentField: viewConfig.contentField || 'content',
    maxContentLength: Number.isFinite(Number(viewConfig.maxContentLength)) ? Number(viewConfig.maxContentLength) : 160,
  };
}

export function getEventTimelineItemTime(item: RecordViewItem, timeField: string) {
  const raw = readField(item, timeField);
  if (!raw) return null;
  const parsed = dayjs(raw as string | number | Date);
  return parsed.isValid() ? parsed : null;
}

export function filterEventTimelineItemsByDateRange(args: {
  items: RecordViewItem[];
  dateRange: [Date, Date];
  timeField: string;
}): RecordViewItem[] {
  const { items, dateRange, timeField } = args;
  return executeRecordQuery(items, {
    date: { range: dateRange, field: timeField, mode: 'strict', precision: 'minute' },
    sort: [{ field: timeField, dir: 'asc' }],
  }).items;
}

export function buildEventTimelineGroupedTree(args: {
  filteredItems: RecordViewItem[];
  groupFields: string[];
  goals?: GoalDefinition[];
}): GroupNode[] | null {
  const { filteredItems, groupFields, goals = [] } = args;
  if (!groupFields.length) return null;
  return executeRecordQuery(filteredItems, {
    groupBy: groupFields,
    groupContext: { goals },
  }).groupTree;
}

export function cleanEventTimelineDisplayText(value: unknown, maxContentLength: number): string {
  const text = String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return '';
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!Number.isFinite(maxContentLength) || maxContentLength <= 0) return compact;
  return compact.length > maxContentLength ? `${compact.slice(0, maxContentLength)}...` : compact;
}

export function getEventTimelineTaskDisplayTitle(args: {
  item: RecordViewItem;
  titleField: string;
  contentField: string;
  maxContentLength: number;
}): string {
  const { item, titleField, contentField, maxContentLength } = args;
  const fromContent = cleanEventTimelineDisplayText(readField(item, contentField), maxContentLength);
  if (fromContent) return fromContent;
  return (
    cleanEventTimelineDisplayText(readField(item, 'content'), maxContentLength) ||
    cleanEventTimelineDisplayText(readField(item, titleField), maxContentLength) ||
    item.title ||
    ''
  );
}

export function buildEventTimelineRenderModel(args: {
  items: RecordViewItem[];
  dateRange: [Date, Date];
  module: ViewInstance;
  goals?: GoalDefinition[];
}): EventTimelineRenderModel {
  const { items, dateRange, module, goals = [] } = args;
  const displayFields = buildEventTimelineDisplayFields(module);
  const groupFields = buildEventTimelineGroupFields(module);
  const viewConfig = buildEventTimelineViewConfig(module);
  const filteredItems = filterEventTimelineItemsByDateRange({
    items,
    dateRange,
    timeField: viewConfig.timeField,
  });
  const groupedTree = buildEventTimelineGroupedTree({ filteredItems, groupFields, goals });

  return { displayFields, groupFields, viewConfig, filteredItems, groupedTree };
}
