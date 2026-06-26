import type { GoalDefinition, GoalTemplate } from '@core/public';
import { getGoalOrderPath, getGoalOrderLabel, sortGoalTemplatesBySettingsOrder, sortGoalsBySettingsOrder } from '@core/public';
import type { CoreBlockDefinition } from '@core/public';
import { getGoalTemplateDisplayName, readGoalTemplateIcon, readGoalTemplateThemePath } from './goalTemplateCopy';

export type GoalTemplateCellStatus = 'inherit' | 'override' | 'multi' | 'disabled' | 'warning';

export interface GoalTemplateCellModel {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  templates: GoalTemplate[];
  enabledTemplates: GoalTemplate[];
  defaultCount: number;
  status: GoalTemplateCellStatus;
  label: string;
  description: string;
}

function cleanPathSegment(value: string): string {
  return value.trim().replace(/^[#＃]+\s*/, '').trim();
}

function normalizePath(value?: string | null): string {
  return String(value || '')
    .split('/')
    .map(cleanPathSegment)
    .filter(Boolean)
    .join('/');
}

export function getGoalDisplayPath(goal: GoalDefinition): string {
  return getGoalOrderPath(goal) || cleanPathSegment(goal.id);
}

export function getGoalDisplayName(goal: GoalDefinition): string {
  return getGoalOrderLabel(goal) || cleanPathSegment(goal.title || goal.id);
}

export function getGoalParentPath(goal: GoalDefinition): string {
  const parts = getGoalDisplayPath(goal).split('/').filter(Boolean);
  return parts.slice(0, -1).join('/');
}

export function getGoalDepth(goal: GoalDefinition): number {
  const path = getGoalDisplayPath(goal);
  const parts = path.split('/').filter(Boolean);
  return Math.max(0, parts.length - 1);
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

export function buildGoalTemplateCell(goal: GoalDefinition, block: CoreBlockDefinition, templates: GoalTemplate[]): GoalTemplateCellModel {
  const cellTemplates = templates.filter((template) => template.goalId === goal.id && template.coreBlockId === block.id);
  const enabledTemplates = cellTemplates.filter((template) => template.enabled !== false);
  const defaultCount = enabledTemplates.filter((template) => template.isDefault).length;
  let status: GoalTemplateCellStatus = 'inherit';
  let label = '添加';
  let description = '点击添加此目标的 Block 预设';

  if (cellTemplates.length > 0 && enabledTemplates.length === 0) {
    status = 'disabled';
    label = '隐藏';
    description = '该目标下隐藏此 Block';
  } else if (defaultCount > 1) {
    status = 'warning';
    label = '异常';
    description = '存在多个默认预设';
  } else if (enabledTemplates.length > 1) {
    status = 'multi';
    label = `选项 ${enabledTemplates.length}`;
    description = '该目标下有多个记录预设选项';
  } else if (enabledTemplates.length === 1) {
    status = 'override';
    label = '有预设';
    description = enabledTemplates[0].name || enabledTemplates[0].variantId || '目标专属预设';
  }

  return { goal, block, templates: cellTemplates, enabledTemplates, defaultCount, status, label, description };
}

export function statusTone(status: GoalTemplateCellStatus): { border: string; background: string; color: string } {
  switch (status) {
    case 'override':
      return { border: 'var(--interactive-accent)', background: 'rgba(80, 140, 255, 0.10)', color: 'var(--text-normal)' };
    case 'multi':
      return { border: 'var(--interactive-accent)', background: 'rgba(80, 180, 120, 0.12)', color: 'var(--text-normal)' };
    case 'disabled':
      return { border: 'var(--text-muted)', background: 'rgba(120, 120, 120, 0.10)', color: 'var(--text-muted)' };
    case 'warning':
      return { border: 'var(--text-error, #d65)', background: 'rgba(220, 90, 70, 0.12)', color: 'var(--text-normal)' };
    case 'inherit':
    default:
      return { border: 'var(--background-modifier-border)', background: 'var(--background-secondary)', color: 'var(--text-muted)' };
  }
}


export type DropPosition = 'before' | 'after';
export type GoalDropState = { goalId: string; position: DropPosition } | null;
export type PresetDragState = { goalId: string; blockId: string; templateKey: string };
export type PresetDropCellState = { goalId: string; blockId: string } | null;

export function normalizeSearchText(value: string): string {
  return String(value || '').toLowerCase().trim();
}

export function cleanDisplayText(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

export function leafPath(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.split('/').filter(Boolean).pop() || text;
}

export function isGeneratedPresetName(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return !text || /^预设\s*\d+$/i.test(text) || /^preset[-_\s]*\d+$/i.test(text) || text === '记录预设' || text === '未命名预设';
}

export function getPresetCardName(template: GoalTemplate, goal: GoalDefinition): string {
  const raw = getGoalTemplateDisplayName(template);
  if (!isGeneratedPresetName(raw)) return raw;
  return cleanDisplayText(leafPath(readGoalTemplateThemePath(template, goal))) || raw;
}

export function goalTemplateKey(template: GoalTemplate): string {
  return template.id || `${template.goalId}:${template.coreBlockId}:${template.variantId || 'default'}`;
}

export function goalTemplateVariantId(template: GoalTemplate): string {
  return String(template.variantId || 'default').trim() || 'default';
}

export function sortPresets<T extends GoalTemplate>(items: T[], goals: GoalDefinition[] = []): T[] {
  return sortGoalTemplatesBySettingsOrder(items, goals);
}

export function buildThemeIconMap(settings: any): Map<string, string> {
  const map = new Map<string, string>();
  for (const theme of settings.inputSettings?.themes || []) {
    if (theme?.path) map.set(String(theme.path), String(theme.icon || ''));
  }
  return map;
}

export function presetSearchText(template: GoalTemplate, goal: GoalDefinition): string {
  return `${getPresetCardName(template, goal)} ${readGoalTemplateThemePath(template, goal)} ${readGoalTemplateIcon(template)}`.toLowerCase();
}

export function getEventDropPosition(event: DragEvent, target?: HTMLElement | null): DropPosition {
  const element = target || event.currentTarget as HTMLElement | null;
  if (!element) return 'after';
  const rect = element.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

export function isSameCell(left: PresetDragState, goal: GoalDefinition, block: CoreBlockDefinition): boolean {
  return left.goalId === goal.id && left.blockId === block.id;
}

export function filterVisibleGoalTemplateMatrixGoals(input: {
  goals: GoalDefinition[];
  expandedPaths: Set<string>;
  query: string;
  templates: GoalTemplate[];
}): GoalDefinition[] {
  const q = normalizeSearchText(input.query);
  return input.goals.filter((goal) => {
    if (!isGoalVisibleByExpandedState(goal, input.expandedPaths)) return false;
    if (!q) return true;
    const goalText = `${getGoalDisplayName(goal)} ${getGoalDisplayPath(goal)} ${goal.themePath || ''}`.toLowerCase();
    if (goalText.includes(q)) return true;
    return input.templates.some((template) => template.goalId === goal.id && presetSearchText(template, goal).includes(q));
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

export function buildNextActiveBlockIds(previous: Set<string>, blockId: string, coreBlocks: CoreBlockDefinition[]): Set<string> {
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

export function toggleGoalCollapsed(previous: Set<string>, goalId: string): Set<string> {
  const next = new Set(previous);
  if (next.has(goalId)) next.delete(goalId);
  else next.add(goalId);
  return next;
}

export function orderDraggedGoalSiblings(input: {
  goals: GoalDefinition[];
  dragGoalId: string;
  targetGoalId: string;
  position: DropPosition;
}): GoalDefinition[] | null {
  if (input.dragGoalId === input.targetGoalId) return null;
  const dragged = input.goals.find((goal) => goal.id === input.dragGoalId);
  const target = input.goals.find((goal) => goal.id === input.targetGoalId);
  if (!dragged || !target) return null;
  const draggedParent = getGoalParentPath(dragged);
  const targetParent = getGoalParentPath(target);
  if (draggedParent !== targetParent) return null;
  const siblings = sortGoalsForMatrix(input.goals.filter((goal) => getGoalParentPath(goal) === draggedParent));
  const next = siblings.filter((goal) => goal.id !== dragged.id);
  const targetIndex = next.findIndex((goal) => goal.id === target.id);
  if (targetIndex < 0) return null;
  next.splice(input.position === 'before' ? targetIndex : targetIndex + 1, 0, dragged);
  return next;
}

export function reorderPresetTemplatesInCell(input: {
  templates: GoalTemplate[];
  goals: GoalDefinition[];
  drag: PresetDragState;
  targetTemplateKey: string | null;
  position: DropPosition;
}): GoalTemplate[] | null {
  const cellTemplates = sortPresets(input.templates.filter((template) => template.goalId === input.drag.goalId && template.coreBlockId === input.drag.blockId && template.enabled !== false), input.goals);
  const dragged = cellTemplates.find((template) => goalTemplateKey(template) === input.drag.templateKey);
  if (!dragged) return null;
  const next = cellTemplates.filter((template) => goalTemplateKey(template) !== input.drag.templateKey);
  if (input.targetTemplateKey) {
    const targetIndex = next.findIndex((template) => goalTemplateKey(template) === input.targetTemplateKey);
    if (targetIndex >= 0) next.splice(input.position === 'before' ? targetIndex : targetIndex + 1, 0, dragged);
    else next.push(dragged);
  } else {
    next.push(dragged);
  }
  return next.map((template, index) => ({ ...template, sortOrder: index * 10 }));
}
