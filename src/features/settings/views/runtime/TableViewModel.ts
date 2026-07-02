import { buildTableMatrix } from '@core/utils/public';
import type { GoalDefinition } from '@core/goal/public';
import type { Item } from '@core/types/public';

export interface BuildTableViewRenderModelInput {
  items: Item[];
  rowField: string;
  colField: string;
  goals?: GoalDefinition[];
}

export interface TableViewRenderModel {
  isConfigured: boolean;
  emptyMessage: string;
  matrix: Record<string, Record<string, Item[]>>;
  sortedRows: string[];
  sortedCols: string[];
}

export function isTableViewConfigured(rowField: string | undefined, colField: string | undefined): boolean {
  return Boolean(rowField && colField);
}

export function getTableViewEmptyMessage(): string {
  return '（表格视图需要配置"行字段"和"列字段"）';
}

export function buildTableViewRenderModel(input: BuildTableViewRenderModelInput): TableViewRenderModel {
  if (!isTableViewConfigured(input.rowField, input.colField)) {
    return {
      isConfigured: false,
      emptyMessage: getTableViewEmptyMessage(),
      matrix: {},
      sortedRows: [],
      sortedCols: [],
    };
  }

  const { matrix, sortedRows, sortedCols } = buildTableMatrix(input.items, input.rowField, input.colField, { goals: input.goals ?? [] });
  return {
    isConfigured: true,
    emptyMessage: '',
    matrix,
    sortedRows,
    sortedCols,
  };
}

export function findTableViewTimer(timers: any[] | undefined, itemId: string): any | undefined {
  return (timers ?? []).find(timer => timer?.taskId === itemId);
}
