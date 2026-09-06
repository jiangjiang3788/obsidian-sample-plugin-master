import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalOrderPath, getGoalOrderLabel, sortGoalsBySettingsOrder, getGoalTemplateDisplayName, resolveGoalIcon } from '@core/goal/public';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';

export type GoalTemplateCellStatus = 'default' | 'override' | 'disabled' | 'warning';

export interface GoalTemplateCellModel {
  goal: GoalDefinition;
  block: TemplateRecordTypeDefinition;
  template: GoalTemplate | null;
  status: GoalTemplateCellStatus;
  label: string;
  description: string;
}

function cleanPathSegment(value: string): string {
  return value.trim();
}

export function getGoalDisplayPath(goal: GoalDefinition): string {
  return getGoalOrderPath(goal) || cleanPathSegment(goal.path);
}

export function getGoalDisplayName(goal: GoalDefinition): string {
  return getGoalOrderLabel(goal) || cleanPathSegment(goal.path);
}

export function getGoalParentPath(goal: GoalDefinition): string {
  const parts = getGoalDisplayPath(goal).split('/').filter(Boolean);
  return parts.slice(0, -1).join('/');
}

export function getGoalDepth(goal: GoalDefinition): number {
  return Math.max(0, getGoalDisplayPath(goal).split('/').filter(Boolean).length - 1);
}

export function goalHasChildren(goal: GoalDefinition, goals: GoalDefinition[]): boolean {
  const path = getGoalDisplayPath(goal);
  return goals.some((item) => getGoalDisplayPath(item).startsWith(`${path}/`));
}

export function isGoalVisibleByExpandedState(goal: GoalDefinition, expandedPaths: Set<string>): boolean {
  const parts = getGoalDisplayPath(goal).split('/').filter(Boolean);
  if (parts.length <= 1) return true;
  for (let index = 1; index < parts.length; index += 1) {
    const parentPath = parts.slice(0, index).join('/');
    if (!expandedPaths.has(parentPath)) return false;
  }
  return true;
}

export function sortGoalsForMatrix(goals: GoalDefinition[]): GoalDefinition[] {
  return sortGoalsBySettingsOrder(goals);
}

export function buildGoalTemplateCell(goal: GoalDefinition, block: TemplateRecordTypeDefinition, templates: GoalTemplate[]): GoalTemplateCellModel {
  const goalPath = getGoalDisplayPath(goal);
  const template = templates.find((item) => item.goalPath === goalPath && item.recordTypeId === block.id) || null;
  if (!template) {
    return { goal, block, template: null, status: 'default', label: '', description: '未配置模板，快捷录入不可用' };
  }
  if (template.enabled === false) {
    return { goal, block, template, status: 'disabled', label: '隐藏', description: '该目标下隐藏此记录类型' };
  }
  return { goal, block, template, status: 'override', label: getGoalTemplateDisplayName(template, goal, block.name), description: '该目标已配置模板' };
}

export function statusTone(status: GoalTemplateCellStatus): { border: string; background: string; color: string } {
  switch (status) {
    case 'override':
      return { border: 'var(--interactive-accent)', background: 'rgba(80, 140, 255, 0.10)', color: 'var(--text-normal)' };
    case 'disabled':
      return { border: 'var(--text-muted)', background: 'rgba(120, 120, 120, 0.10)', color: 'var(--text-muted)' };
    case 'warning':
      return { border: 'var(--text-error, #d65)', background: 'rgba(220, 90, 70, 0.12)', color: 'var(--text-normal)' };
    case 'default':
    default:
      return { border: 'var(--background-modifier-border)', background: 'var(--background-secondary)', color: 'var(--text-muted)' };
  }
}

export type DropPosition = 'before' | 'after';
export type GoalDropState = { goalPath: string; position: DropPosition } | null;

export function normalizeSearchText(value: string): string {
  return String(value || '').toLowerCase().trim();
}

export function cleanDisplayText(value: unknown): string {
  return String(value ?? '').trim();
}

export function getPresetCardName(template: GoalTemplate, goal: GoalDefinition, fallback = '模板'): string {
  return getGoalTemplateDisplayName(template, goal, fallback);
}

export function goalTemplateKey(template: GoalTemplate): string {
  return template.id || `${template.goalPath}:${template.recordTypeId}`;
}

export function goalTemplateIcon(template: GoalTemplate, goal: GoalDefinition): string {
  return resolveGoalIcon(goal) || '◇';
}

export function presetSearchText(template: GoalTemplate, goal: GoalDefinition): string {
  return `${getGoalDisplayPath(goal)} ${template.recordTypeId} ${template.description || ''}`.toLowerCase();
}

export function getEventDropPosition(event: DragEvent, target?: HTMLElement | null): DropPosition {
  const element = target || event.currentTarget as HTMLElement | null;
  if (!element) return 'after';
  const rect = element.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

export function filterVisibleGoalTemplateMatrixGoals(input: {
  goals: GoalDefinition[];
  expandedPaths: Set<string>;
  query: string;
  templates: GoalTemplate[];
}): GoalDefinition[] {
  const q = normalizeSearchText(input.query);
  return input.goals.filter((goal) => {
    if (!q) return isGoalVisibleByExpandedState(goal, input.expandedPaths);
    const goalText = `${getGoalDisplayName(goal)} ${getGoalDisplayPath(goal)}`.toLowerCase();
    if (goalText.includes(q)) return true;
    const path = getGoalDisplayPath(goal);
    return input.templates.some((template) => template.goalPath === path && presetSearchText(template, goal).includes(q));
  });
}

export function splitGoalsByRoot(goals: GoalDefinition[]): GoalDefinition[][] {
  const groups: GoalDefinition[][] = [];
  let current: GoalDefinition[] = [];
  goals.forEach((goal) => {
    if (getGoalDepth(goal) === 0) {
      if (current.length > 0) groups.push(current);
      current = [goal];
    } else if (current.length > 0) {
      current.push(goal);
    } else {
      current = [goal];
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}

export function buildNextActiveBlockIds(previous: Set<string>, blockId: string, coreBlocks: TemplateRecordTypeDefinition[]): Set<string> {
  const next = new Set(previous);
  if (next.size === 0) coreBlocks.forEach((block) => next.add(block.id));
  if (next.has(blockId) && next.size > 1) next.delete(blockId);
  else next.add(blockId);
  return next;
}

export function addAllGoalPaths(previous: Set<string>, allGoalPaths: Set<string>): Set<string> {
  const next = new Set(previous);
  allGoalPaths.forEach((path) => next.add(path));
  return next;
}

export function toggleGoalPath(previous: Set<string>, path: string): Set<string> {
  const next = new Set(previous);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  return next;
}

export function toggleGoalCollapsed(previous: Set<string>, goalPath: string): Set<string> {
  const next = new Set(previous);
  if (next.has(goalPath)) next.delete(goalPath);
  else next.add(goalPath);
  return next;
}

export function orderDraggedGoalSiblings(input: {
  goals: GoalDefinition[];
  dragGoalPath: string;
  targetGoalPath: string;
  position: DropPosition;
}): GoalDefinition[] | null {
  if (input.dragGoalPath === input.targetGoalPath) return null;
  const dragged = input.goals.find((goal) => goal.path === input.dragGoalPath);
  const target = input.goals.find((goal) => goal.path === input.targetGoalPath);
  if (!dragged || !target) return null;
  const draggedParent = getGoalParentPath(dragged);
  const targetParent = getGoalParentPath(target);
  if (draggedParent !== targetParent) return null;
  const siblings = sortGoalsForMatrix(input.goals.filter((goal) => getGoalParentPath(goal) === draggedParent));
  const next = siblings.filter((goal) => goal.path !== dragged.path);
  const targetIndex = next.findIndex((goal) => goal.path === target.path);
  if (targetIndex < 0) return null;
  next.splice(input.position === 'before' ? targetIndex : targetIndex + 1, 0, dragged);
  return next;
}
