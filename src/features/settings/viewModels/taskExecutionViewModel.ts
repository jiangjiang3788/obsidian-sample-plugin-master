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

function buildTaskKey(item: Item): string {
  return [item.file?.path || '', String(item.title || '').trim(), item.theme || ''].join('::');
}

function getThemeGroup(theme?: string): { parent: string; child: string } {
  const segments = parsePath(String(theme || '').trim());
  return {
    parent: segments[0]?.name || '未分类',
    child: segments[1]?.name || '',
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
    if (onlyRecurring && !item.recurrence) return false;
    return true;
  });

  const baseTasks = filtered.filter((item) => isTaskOpen(item) && (!!item.recurrence || !onlyRecurring));
  const completed = filtered.filter((item) => {
    if (!isTaskCompleted(item)) return false;
    if (!item.doneDate) return false;
    const done = dayjs(item.doneDate);
    return done.isValid() && !done.isBefore(startDay) && !done.isAfter(endDay);
  });

  const recordMap = new Map<string, TaskExecutionRecordVM[]>();
  for (const item of completed) {
    const key = buildTaskKey(item);
    const list = recordMap.get(key) || [];
    list.push({ id: item.id, doneDate: item.doneDate, timeLabel: formatRecordTime(item), item });
    recordMap.set(key, list);
  }
  recordMap.forEach((list) => {
    list.sort((a, b) => `${b.doneDate || ''} ${b.timeLabel}`.localeCompare(`${a.doneDate || ''} ${a.timeLabel}`, 'zh-CN'));
  });

  const sectionMap = new Map<string, Map<string, TaskExecutionTaskVM[]>>();
  for (const item of baseTasks) {
    const { parent, child } = getThemeGroup(item.theme);
    if (!sectionMap.has(parent)) sectionMap.set(parent, new Map());
    const childKey = child || '__root__';
    const childMap = sectionMap.get(parent)!;
    if (!childMap.has(childKey)) childMap.set(childKey, []);

    const key = buildTaskKey(item);
    childMap.get(childKey)!.push({
      key,
      itemId: item.id,
      title: String(item.title || '').trim(),
      count: (recordMap.get(key) || []).length,
      recurrenceLabel: String(item.recurrence || '').trim(),
      records: recordMap.get(key) || [],
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
          title: child === '__root__' ? '' : child,
          tasks: tasks.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')),
        }))
        .sort((a, b) => {
          if (!a.title && !b.title) return 0;
          if (!a.title) return -1;
          if (!b.title) return 1;
          return a.title.localeCompare(b.title, 'zh-CN');
        }),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

  return { sections };
}
