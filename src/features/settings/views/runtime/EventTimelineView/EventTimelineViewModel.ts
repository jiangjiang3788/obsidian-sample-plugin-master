import type { GoalDefinition } from '@core/goal/public';
import type { Item, ViewInstance } from '@core/types/public';
import { dayjs, groupItemsByFields, type GroupNode } from '@core/utils/public';
import { normalizeDisplayFields } from '@core/view/public';
import { readField } from '@core/types/public';

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
  filteredItems: Item[];
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

export function getEventTimelineItemTime(item: Item, timeField: string) {
  const raw = readField(item, timeField);
  if (!raw) return null;
  try {
    return dayjs(raw);
  } catch {
    return null;
  }
}

export function filterEventTimelineItemsByDateRange(args: {
  items: Item[];
  dateRange: [Date, Date];
  timeField: string;
  injectedFilteredItems?: Item[];
}): Item[] {
  const { items, dateRange, timeField, injectedFilteredItems } = args;
  if (injectedFilteredItems !== undefined) return injectedFilteredItems;

  const start = dayjs(dateRange[0]);
  const end = dayjs(dateRange[1]);
  const result: Item[] = [];

  for (const item of items) {
    const t = getEventTimelineItemTime(item, timeField);
    if (!t) continue;
    if (!t.isBetween(start, end, 'minute', '[]')) continue;
    result.push(item);
  }

  return result.sort((a, b) => {
    const ta = getEventTimelineItemTime(a, timeField)!;
    const tb = getEventTimelineItemTime(b, timeField)!;
    return ta.valueOf() - tb.valueOf();
  });
}

export function buildEventTimelineGroupedTree(args: {
  filteredItems: Item[];
  groupFields: string[];
  injectedGroupedTree?: GroupNode[] | null;
  goals?: GoalDefinition[];
}): GroupNode[] | null {
  const { filteredItems, groupFields, injectedGroupedTree, goals = [] } = args;
  if (injectedGroupedTree !== undefined) return injectedGroupedTree;
  if (!groupFields.length) return null;
  return groupItemsByFields(filteredItems, groupFields, { goals });
}

export function cleanEventTimelineDisplayText(value: unknown, maxContentLength: number): string {
  const text = String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return '';
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!Number.isFinite(maxContentLength) || maxContentLength <= 0) return compact;
  return compact.length > maxContentLength ? `${compact.slice(0, maxContentLength)}...` : compact;
}

export function getEventTimelineTaskDisplayTitle(args: {
  item: Item;
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
  items: Item[];
  dateRange: [Date, Date];
  module: ViewInstance;
  injectedFilteredItems?: Item[];
  injectedGroupedTree?: GroupNode[] | null;
  goals?: GoalDefinition[];
}): EventTimelineRenderModel {
  const { items, dateRange, module, injectedFilteredItems, injectedGroupedTree, goals = [] } = args;
  const displayFields = buildEventTimelineDisplayFields(module);
  const groupFields = buildEventTimelineGroupFields(module);
  const viewConfig = buildEventTimelineViewConfig(module);
  const filteredItems = filterEventTimelineItemsByDateRange({
    items,
    dateRange,
    timeField: viewConfig.timeField,
    injectedFilteredItems,
  });
  const groupedTree = buildEventTimelineGroupedTree({ filteredItems, groupFields, injectedGroupedTree, goals });

  return { displayFields, groupFields, viewConfig, filteredItems, groupedTree };
}
