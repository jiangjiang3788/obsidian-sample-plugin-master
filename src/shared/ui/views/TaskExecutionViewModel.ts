import type { Item } from '@core/public';

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

export interface TaskExecutionModelVM {
  sections: TaskExecutionSectionVM[];
}

export interface TaskExecutionMenuState {
  x: number;
  y: number;
  taskKey: string;
}

export function getTaskExecutionChipToneClass(recurrenceLabel: string): string {
  const recurrence = String(recurrenceLabel || '').trim().toLowerCase();

  if (!recurrence) return 'task-execution-chip--tone-0';
  if (recurrence.includes('day')) return 'task-execution-chip--tone-1';
  if (recurrence.includes('week')) return 'task-execution-chip--tone-2';
  if (recurrence.includes('month')) return 'task-execution-chip--tone-3';
  if (recurrence.includes('year')) return 'task-execution-chip--tone-4';

  return 'task-execution-chip--tone-0';
}

export function buildTaskExecutionTaskMap(model?: TaskExecutionModelVM | null): Map<string, TaskExecutionTaskVM> {
  const map = new Map<string, TaskExecutionTaskVM>();
  for (const section of model?.sections || []) {
    for (const group of section.groups || []) {
      for (const task of group.tasks || []) map.set(task.key, task);
    }
  }
  return map;
}

export function getTaskExecutionSelectedTask(args: {
  menu: TaskExecutionMenuState | null;
  taskMap: Map<string, TaskExecutionTaskVM>;
}): TaskExecutionTaskVM | null {
  const { menu, taskMap } = args;
  return menu ? taskMap.get(menu.taskKey) || null : null;
}

export function buildTaskExecutionCountLabel(currentView: string, count: number): string {
  return `${currentView}内完成 ${count} 次`;
}

export function getTaskExecutionRecordLabel(record: TaskExecutionRecordVM): string {
  return record.timeLabel || record.doneDate || '查看记录';
}
