import type { FilterRule, RecordViewItem } from '@core/types/public';
import { getGoalPathCandidates, getParentGoalPath, normalizeGoalPath } from '@core/goal/public';
import { getRecordSchemaDefinition } from '@core/records/public';
import { compareRecordTypeKeys } from '@core/recordTypes/public';
import { dayjs } from '@core/utils/public';
import {
  queryRecordItems,
  type RecordQueryDateRole,
  type RecordQuerySpec,
} from '@core/view/public';

export const WHITEBOARD_SOURCE_MAX_VISIBLE_RESULTS = 80;

export const WHITEBOARD_SOURCE_DATE_ROLES: ReadonlyArray<{ value: RecordQueryDateRole; label: string }> = [
  { value: 'default', label: '记录日期' },
  { value: 'task-scheduled', label: '任务计划时间' },
  { value: 'task-due', label: '任务截止时间' },
  { value: 'task-completed', label: '任务完成时间' },
  { value: 'task-actual', label: '实际执行时间' },
];

export interface WhiteboardRecordSourceTimeState {
  role: RecordQueryDateRole;
  startDate: string;
  endDate: string;
}

export interface WhiteboardRecordSourceState {
  keyword: string;
  recordTypes: string[];
  /** 精确 canonical Goal path 集合；父节点勾选由 UI 展开成整个可见子树。 */
  goalPaths: string[];
  time: WhiteboardRecordSourceTimeState | null;
}

export interface WhiteboardRecordTypeOption {
  value: string;
  label: string;
}

export interface WhiteboardGoalTreeNode {
  value: string;
  label: string;
  children: WhiteboardGoalTreeNode[];
  /** 当前节点及其全部后代中，真实 Record 实际使用的精确 Goal paths。 */
  selectableGoalPaths: string[];
}

export interface WhiteboardRecordSourceResult {
  matchedItems: RecordViewItem[];
  visibleItems: RecordViewItem[];
  totalCount: number;
  visibleCount: number;
  dateError: string | null;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'zh');
}

function goalLeaf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function collectWhiteboardRecordTypeOptions(records: readonly RecordViewItem[]): WhiteboardRecordTypeOption[] {
  const values = new Set<string>();
  for (const record of records) {
    const coreBlock = String(record.coreBlock || '').trim();
    if (coreBlock) values.add(coreBlock);
  }

  return Array.from(values)
    .map((value) => ({ value, label: getRecordSchemaDefinition(value)?.name || value }))
    .sort((a, b) => compareRecordTypeKeys(a.value, b.value) || compareText(a.label, b.label));
}

/**
 * 从历史 Record 的 canonical goalPath 构造层级树。
 * 合成父节点只负责导航；selectableGoalPaths 永远只包含真实 Record 实际使用过的精确路径。
 */
export function collectWhiteboardGoalTree(records: readonly RecordViewItem[]): WhiteboardGoalTreeNode[] {
  const exactPaths = new Set<string>();
  const allPaths = new Set<string>();
  for (const record of records) {
    const goalPath = normalizeGoalPath(record.goalPath);
    if (!goalPath) continue;
    exactPaths.add(goalPath);
    for (const candidate of getGoalPathCandidates(goalPath)) allPaths.add(candidate);
  }

  const nodes = new Map<string, WhiteboardGoalTreeNode>();
  for (const value of allPaths) {
    nodes.set(value, { value, label: goalLeaf(value), children: [], selectableGoalPaths: [] });
  }

  const roots: WhiteboardGoalTreeNode[] = [];
  for (const value of Array.from(allPaths).sort(compareText)) {
    const node = nodes.get(value)!;
    const parentPath = getParentGoalPath(value);
    const parent = parentPath ? nodes.get(parentPath) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const finalize = (node: WhiteboardGoalTreeNode): string[] => {
    node.children.sort((a, b) => compareText(a.label, b.label));
    const selectable: string[] = exactPaths.has(node.value) ? [node.value] : [];
    for (const child of node.children) selectable.push(...finalize(child));
    node.selectableGoalPaths = Array.from(new Set(selectable)).sort(compareText);
    return node.selectableGoalPaths;
  };
  roots.sort((a, b) => compareText(a.label, b.label));
  roots.forEach(finalize);
  return roots;
}

/** 单个 Goal 的真实 Record scope；主要供树节点/测试验证 canonical hierarchy。 */
export function buildWhiteboardGoalScope(records: readonly RecordViewItem[], selectedGoalPath: string | null): string[] {
  const selected = normalizeGoalPath(selectedGoalPath);
  if (!selected) return [];
  const observed = new Set<string>();
  for (const record of records) {
    const goalPath = normalizeGoalPath(record.goalPath);
    if (!goalPath) continue;
    if (goalPath === selected || goalPath.startsWith(`${selected}/`)) observed.add(goalPath);
  }
  return Array.from(observed).sort(compareText);
}

export function validateWhiteboardRecordSourceTime(time: WhiteboardRecordSourceTimeState | null): string | null {
  if (!time) return null;
  const start = dayjs(time.startDate);
  const end = dayjs(time.endDate);
  if (!time.startDate || !time.endDate || !start.isValid() || !end.isValid()) return '请选择有效的开始和结束日期';
  if (start.startOf('day').valueOf() > end.endOf('day').valueOf()) return '开始日期不能晚于结束日期';
  return null;
}

function buildFilterGroups(state: WhiteboardRecordSourceState): FilterRule[][] {
  const groups: FilterRule[][] = [];

  const recordTypes = Array.from(new Set(state.recordTypes.map((value) => String(value || '').trim()).filter(Boolean)));
  if (recordTypes.length) groups.push([{ field: 'coreBlock', op: 'in', value: recordTypes }]);

  const goalPaths = Array.from(new Set(state.goalPaths.map((value) => normalizeGoalPath(value)).filter((value): value is string => Boolean(value))));
  if (goalPaths.length) groups.push([{ field: 'goalPath', op: 'in', value: goalPaths }]);

  return groups;
}

export function buildWhiteboardRecordSourceSpec(
  _records: RecordViewItem[],
  state: WhiteboardRecordSourceState,
): RecordQuerySpec {
  const spec: RecordQuerySpec = {};
  const filterGroups = buildFilterGroups(state);
  if (filterGroups.length) spec.filterGroups = filterGroups;

  const keyword = state.keyword.trim();
  if (keyword) spec.keyword = keyword;

  if (state.time && !validateWhiteboardRecordSourceTime(state.time)) {
    const start = dayjs(state.time.startDate).startOf('day');
    const end = dayjs(state.time.endDate).endOf('day');
    spec.date = {
      range: [start.toDate(), end.toDate()],
      mode: 'strict',
      precision: 'day',
      role: state.time.role,
    };
  }

  return spec;
}

export function queryWhiteboardRecordSource(
  records: RecordViewItem[],
  state: WhiteboardRecordSourceState,
  excludedRecordIds?: ReadonlySet<string>,
): WhiteboardRecordSourceResult {
  const queriedItems = queryRecordItems(records, buildWhiteboardRecordSourceSpec(records, state));
  const matchedItems = excludedRecordIds?.size
    ? queriedItems.filter((record) => !excludedRecordIds.has(record.id))
    : queriedItems;
  const visibleItems = matchedItems.slice(0, WHITEBOARD_SOURCE_MAX_VISIBLE_RESULTS);
  return {
    matchedItems,
    visibleItems,
    totalCount: matchedItems.length,
    visibleCount: visibleItems.length,
    dateError: validateWhiteboardRecordSourceTime(state.time),
  };
}
