import { groupItemsByFields, type GroupNode } from '@core/utils/public';
import type { GoalDefinition } from '@core/goal/public';
import type { Item } from '@core/types/public';

export interface ResolveBlockViewGroupFieldsInput {
  groupField?: string;
  groupFields?: string[];
  effectiveGroupFields?: string[];
}

export interface BuildBlockViewRenderModelInput extends ResolveBlockViewGroupFieldsInput {
  items: Item[];
  groupTree?: GroupNode[] | null;
  goals?: GoalDefinition[];
}

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

export function resolveBlockViewGroupFields(input: ResolveBlockViewGroupFieldsInput): string[] {
  if (input.effectiveGroupFields) return input.effectiveGroupFields;
  if (input.groupFields && input.groupFields.length > 0) return input.groupFields;
  if (input.groupField) return [input.groupField];
  return [];
}

export function buildBlockViewRenderModel(input: BuildBlockViewRenderModelInput): BlockViewRenderModel {
  const effectiveGroupFields = resolveBlockViewGroupFields(input);
  const isGrouped = effectiveGroupFields.length > 0;
  const groupTree = isGrouped
    ? ((input.groupTree ?? groupItemsByFields(input.items, effectiveGroupFields, { goals: input.goals ?? [] })) as GroupNode[])
    : [];

  return {
    effectiveGroupFields,
    groupTree,
    isGrouped,
  };
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
