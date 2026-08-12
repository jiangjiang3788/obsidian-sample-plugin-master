import type { GroupNode } from '@core/utils/public';
import { executeRecordQuery } from '@core/view/public';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordViewItem } from '@core/types/public';

export interface BlockViewRenderModel {
  effectiveGroupFields: string[];
  groupTree: GroupNode[];
  isGrouped: boolean;
}

export interface BlockViewGroupClassNames {
  root: string;
  group: string;
  title: string;
  content: string;
  toggleIcon: string;
  label: string;
}

export function resolveBlockViewGroupFields(groupField?: string, groupFields?: string[]): string[] {
  if (groupFields && groupFields.length > 0) return groupFields;
  if (groupField) return [groupField];
  return [];
}

export function buildBlockViewRenderModel(input: {
  items: RecordViewItem[];
  groupField?: string;
  groupFields?: string[];
  goals?: GoalDefinition[];
}): BlockViewRenderModel {
  const effectiveGroupFields = resolveBlockViewGroupFields(input.groupField, input.groupFields);
  const isGrouped = effectiveGroupFields.length > 0;
  const groupTree = isGrouped
    ? (executeRecordQuery(input.items, {
        groupBy: effectiveGroupFields,
        groupContext: { goals: input.goals ?? [] },
      }).groupTree ?? [])
    : [];
  return { effectiveGroupFields, groupTree, isGrouped };
}

export function findBlockViewTimer(timers: any[] | undefined, itemId: string): any | undefined {
  return (timers ?? []).find(timer => timer?.taskId === itemId);
}

export function buildBlockViewGroupClassNames(): BlockViewGroupClassNames {
  return {
    root: '',
    group: 'bv-group bv-group--level-0',
    title: 'bv-group-title',
    content: 'bv-group-content',
    toggleIcon: 'bv-group-toggle-icon',
    label: 'bv-group-label',
  };
}
