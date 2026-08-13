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

export interface BlockViewGroupingInput {
  effectiveGroupFields?: string[];
  groupFields?: string[];
  groupField?: string;
}

export function resolveBlockViewGroupFields(input: BlockViewGroupingInput = {}): string[] {
  if (input.effectiveGroupFields?.length) return [...input.effectiveGroupFields];
  if (input.groupFields?.length) return [...input.groupFields];
  if (input.groupField) return [input.groupField];
  return [];
}

export function buildBlockViewRenderModel(input: BlockViewGroupingInput & {
  items: RecordViewItem[];
  groupTree?: GroupNode[];
  goals?: GoalDefinition[];
}): BlockViewRenderModel {
  const effectiveGroupFields = resolveBlockViewGroupFields(input);
  const isGrouped = effectiveGroupFields.length > 0;
  const groupTree = !isGrouped
    ? []
    : input.groupTree ?? (executeRecordQuery(input.items, {
        groupBy: effectiveGroupFields,
        groupContext: { goals: input.goals ?? [] },
      }).groupTree ?? []);
  return { effectiveGroupFields, groupTree, isGrouped };
}

export function findBlockViewTimer(timers: any[] | undefined, itemId: string): any | undefined {
  return (timers ?? []).find(timer => timer?.taskId === itemId);
}

export function buildBlockViewGroupClassNames(): BlockViewGroupClassNames {
  return {
    root: '',
    group: 'bv-group',
    title: 'bv-group-title think-list-disclosure-row',
    content: 'bv-group-content',
    toggleIcon: 'bv-group-toggle-icon',
    label: 'bv-group-label',
  };
}
