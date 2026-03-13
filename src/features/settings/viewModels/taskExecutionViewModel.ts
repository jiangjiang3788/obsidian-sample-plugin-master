import type { Item, ThemeDefinition, ViewInstance } from '@core/public';
import { buildThemePathTree, dayjs, filterByKeyword, filterByRules, getBasePath, isTaskCompleted, isTaskOpen } from '@core/public';

export interface TaskExecutionRecord {
  id: string;
  doneDate?: string;
  timeLabel: string;
  item: Item;
}

export interface TaskExecutionTask {
  key: string;
  itemId: string;
  title: string;
  theme?: string;
  themeLabel: string;
  recurrenceLabel: string;
  count: number;
  records: TaskExecutionRecord[];
  item: Item;
}

export interface TaskExecutionThemeSection {
  key: string;
  title: string;
  tasks: TaskExecutionTask[];
}

export interface TaskExecutionViewModel {
  sections: TaskExecutionThemeSection[];
}

function normalizeTitle(title?: string): string {
  return String(title || '').trim();
}

function buildGroupKey(item: Item): string {
  return [item.file?.path || '', normalizeTitle(item.title), item.theme || ''].join('::');
}

function getTopThemeLabel(themePath: string | undefined, rootLabelMap: Map<string, string>): string {
  if (!themePath) return '未分类';
  return rootLabelMap.get(themePath) || themePath.split('/')[0] || '未分类';
}

function getLeafThemeLabel(themePath?: string): string {
  if (!themePath) return '未分类';
  return themePath.split('/').pop() || themePath;
}

function buildRootThemeLabelMap(themes: ThemeDefinition[]): Map<string, string> {
  const tree = buildThemePathTree(themes);
  const map = new Map<string, string>();

  const visit = (node: any, rootLabel: string) => {
    map.set(node.path, rootLabel);
    (node.children || []).forEach((child: any) => visit(child, rootLabel));
  };

  tree.forEach((root: any) => visit(root, root.label));
  return map;
}

function matchesTheme(item: Item, selectedThemes: string[]): boolean {
  if (!selectedThemes.length) return true;
  return !!item.theme && selectedThemes.includes(item.theme);
}

function matchesCategory(item: Item, selectedCategories: string[]): boolean {
  if (!selectedCategories.length) return true;
  return selectedCategories.includes(getBasePath(item.categoryKey));
}

function formatTimeLabel(item: Item): string {
  return String(item.endTime || item.startTime || item.extra?.['结束'] || item.extra?.['时间'] || item.doneDate || '').trim();
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
  const {
    items,
    dateRange,
    viewInstance,
    keyword,
    selectedThemes,
    selectedCategories,
    allThemes,
  } = params;

  const rootThemeLabelMap = buildRootThemeLabelMap(allThemes || []);
  const [start, end] = dateRange;
  const startDay = dayjs(start).startOf('day');
  const endDay = dayjs(end).endOf('day');

  const filtered = filterByKeyword(filterByRules(items, viewInstance.filters || []), keyword).filter((item) => {
    if (item.type !== 'task') return false;
    if (!matchesTheme(item, selectedThemes)) return false;
    if (!matchesCategory(item, selectedCategories)) return false;
    return true;
  });

  const baseTasks = filtered.filter((item) => isTaskOpen(item) && !!item.recurrence);
  const completedRecords = filtered.filter((item) => {
    if (!isTaskCompleted(item)) return false;
    if (!item.doneDate) return false;
    const done = dayjs(item.doneDate);
    if (!done.isValid()) return false;
    return (done.isSame(startDay) || done.isAfter(startDay)) && (done.isSame(endDay) || done.isBefore(endDay));
  });

  const recordMap = new Map<string, TaskExecutionRecord[]>();
  for (const item of completedRecords) {
    const key = buildGroupKey(item);
    const arr = recordMap.get(key) || [];
    arr.push({
      id: item.id,
      doneDate: item.doneDate,
      timeLabel: formatTimeLabel(item),
      item,
    });
    recordMap.set(key, arr);
  }

  recordMap.forEach((records) => {
    records.sort((a, b) => {
      const aValue = `${a.doneDate || ''} ${a.timeLabel || ''}`;
      const bValue = `${b.doneDate || ''} ${b.timeLabel || ''}`;
      return bValue.localeCompare(aValue);
    });
  });

  const sectionMap = new Map<string, TaskExecutionThemeSection>();
  for (const item of baseTasks) {
    const key = buildGroupKey(item);
    const themeTitle = getTopThemeLabel(item.theme, rootThemeLabelMap);
    if (!sectionMap.has(themeTitle)) {
      sectionMap.set(themeTitle, { key: themeTitle, title: themeTitle, tasks: [] });
    }
    sectionMap.get(themeTitle)!.tasks.push({
      key,
      itemId: item.id,
      title: normalizeTitle(item.title),
      theme: item.theme,
      themeLabel: getLeafThemeLabel(item.theme),
      recurrenceLabel: String(item.recurrence || '').trim(),
      count: (recordMap.get(key) || []).length,
      records: recordMap.get(key) || [],
      item,
    });
  }

  const rootOrder = buildThemePathTree(allThemes || []).map((node: any) => node.label);
  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    const ai = rootOrder.indexOf(a.title);
    const bi = rootOrder.indexOf(b.title);
    if (ai === -1 && bi === -1) return a.title.localeCompare(b.title, 'zh-Hans-CN');
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  sections.forEach((section) => {
    section.tasks.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  });

  return { sections };
}
