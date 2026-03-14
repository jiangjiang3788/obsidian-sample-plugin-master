import type { Item, ThemeDefinition, ViewInstance } from '@core/public';
import {
  dayjs,
  filterByKeyword,
  filterByRules,
  getBasePath,
  isTaskCompleted,
  isTaskOpen,
  parsePath,
} from '@core/public';

export interface TaskExecutionRecordVM {
  id: string;
  doneDate?: string;
  timeLabel: string;
  item: Item;
}

export interface TaskExecutionTaskVM {
  key: string;
  aggregateKey: string;
  itemId: string;
  title: string;
  count: number;
  recurrenceLabel: string;
  records: TaskExecutionRecordVM[];
  item: Item;
}

export interface TaskExecutionSubgroupVM {
  key: string;
  title: string;
  tasks: TaskExecutionTaskVM[];
}

export interface TaskExecutionSectionVM {
  key: string;
  title: string;
  groups: TaskExecutionSubgroupVM[];
}

export interface TaskExecutionViewModel {
  sections: TaskExecutionSectionVM[];
}

function buildAggregateKey(item: Item): string {
  return [item.file?.path || '', String(item.title || '').trim(), item.theme || ''].join('::');
}

function buildRenderKey(item: Item): string {
  return String(item.id || buildAggregateKey(item));
}

function getThemeGroup(theme?: string): { parent: string; child: string } {
  const segments = parsePath(String(theme || '').trim());
  return {
    parent: segments[0]?.name || '未分类',
    child: segments[1]?.name || '任务',
  };
}

function matchesTheme(item: Item, selectedThemes: string[]): boolean {
  if (!selectedThemes.length) return true;
  return !!item.theme && selectedThemes.includes(item.theme);
}

function matchesCategory(item: Item, selectedCategories: string[]): boolean {
  if (!selectedCategories.length) return true;
  return selectedCategories.includes(getBasePath(item.categoryKey));
}

function formatRecordTime(item: Item): string {
  return String(item.endTime || item.startTime || item.doneDate || '').trim();
}

function hasRecurringRule(item: Item): boolean {
  const value = String(item.recurrence || '').trim();
  return !!value && value.toLowerCase() !== 'none';
}

export function buildTaskExecutionViewModel(params: {
  items: Item[];
  dateRange: [Date, Date];
  viewInstance: ViewInstance;
  keyword: string;
  selectedThemes: string[];
  selectedCategories: string[];
  allThemes: ThemeDefinition[];
}): TaskExecutionViewModel {
  const { items, dateRange, viewInstance, keyword, selectedThemes, selectedCategories } = params;
  const [start, end] = dateRange;
  const startDay = dayjs(start).startOf('day');
  const endDay = dayjs(end).endOf('day');
  const onlyRecurring = viewInstance.viewConfig?.onlyRecurring !== false;

  const filtered = filterByKeyword(filterByRules(items, viewInstance.filters || []), keyword).filter((item) => {
    if (item.type !== 'task') return false;
    if (!matchesTheme(item, selectedThemes)) return false;
    if (!matchesCategory(item, selectedCategories)) return false;
    if (onlyRecurring && !hasRecurringRule(item)) return false;
    return true;
  });

  const baseTasks = filtered.filter((item) => isTaskOpen(item) && (hasRecurringRule(item) || !onlyRecurring));
  const completed = filtered.filter((item) => {
    if (!isTaskCompleted(item)) return false;
    if (!item.doneDate) return false;
    const done = dayjs(item.doneDate);
    return done.isValid() && !done.isBefore(startDay) && !done.isAfter(endDay);
  });

  const recordMap = new Map<string, TaskExecutionRecordVM[]>();
  for (const item of completed) {
    const aggregateKey = buildAggregateKey(item);
    const list = recordMap.get(aggregateKey) || [];
    list.push({ id: item.id, doneDate: item.doneDate, timeLabel: formatRecordTime(item), item });
    recordMap.set(aggregateKey, list);
  }
  recordMap.forEach((list) => {
    list.sort((a, b) => `${b.doneDate || ''} ${b.timeLabel}`.localeCompare(`${a.doneDate || ''} ${a.timeLabel}`, 'zh-CN'));
  });

  const sectionMap = new Map<string, Map<string, TaskExecutionTaskVM[]>>();
  for (const item of baseTasks) {
    const group = getThemeGroup(item.theme);
    if (!sectionMap.has(group.parent)) sectionMap.set(group.parent, new Map());
    const childMap = sectionMap.get(group.parent)!;
    if (!childMap.has(group.child)) childMap.set(group.child, []);

    const aggregateKey = buildAggregateKey(item);
    childMap.get(group.child)!.push({
      key: buildRenderKey(item),
      aggregateKey,
      itemId: item.id,
      title: String(item.title || '').trim(),
      count: (recordMap.get(aggregateKey) || []).length,
      recurrenceLabel: String(item.recurrence || '').trim(),
      records: recordMap.get(aggregateKey) || [],
      item,
    });
  }

  const sections: TaskExecutionSectionVM[] = Array.from(sectionMap.entries())
    .map(([parent, childMap]) => ({
      key: parent,
      title: parent,
      groups: Array.from(childMap.entries())
        .map(([child, tasks]) => ({
          key: `${parent}/${child}`,
          title: child,
          tasks: tasks.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')),
        }))
        .sort((a, b) => {
          if (a.title === '任务' && b.title !== '任务') return -1;
          if (b.title === '任务' && a.title !== '任务') return 1;
          return a.title.localeCompare(b.title, 'zh-CN');
        }),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

  return { sections };
}
