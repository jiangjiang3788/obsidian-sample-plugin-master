import type { GoalDefinition, GoalTemplate } from '@core/public';
import type { CoreBlockDefinition } from '@core/public';

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
  return normalizePath(goal.goalPath || goal.title || goal.id) || cleanPathSegment(goal.id);
}

export function getGoalDisplayName(goal: GoalDefinition): string {
  const path = getGoalDisplayPath(goal);
  return cleanPathSegment(path.split('/').filter(Boolean).pop() || goal.title || goal.id);
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

function goalSortOrder(goal: GoalDefinition): number {
  const value = Number((goal as any).sortOrder);
  return Number.isFinite(value) ? value : 999999;
}

function getGoalByPath(goals: GoalDefinition[], path: string): GoalDefinition | null {
  return goals.find((goal) => getGoalDisplayPath(goal) === path) || null;
}

export function sortGoalsForMatrix(goals: GoalDefinition[]): GoalDefinition[] {
  return [...goals].sort((left, right) => {
    const leftParts = getGoalDisplayPath(left).split('/').filter(Boolean);
    const rightParts = getGoalDisplayPath(right).split('/').filter(Boolean);
    const max = Math.min(leftParts.length, rightParts.length);
    for (let index = 0; index < max; index += 1) {
      if (leftParts[index] === rightParts[index]) continue;
      const parentPath = leftParts.slice(0, index).join('/');
      const leftSiblingPath = [...leftParts.slice(0, index), leftParts[index]].join('/');
      const rightSiblingPath = [...rightParts.slice(0, index), rightParts[index]].join('/');
      const leftSiblingGoal = getGoalByPath(goals, leftSiblingPath);
      const rightSiblingGoal = getGoalByPath(goals, rightSiblingPath);
      const leftOrder = leftSiblingGoal ? goalSortOrder(leftSiblingGoal) : 999999;
      const rightOrder = rightSiblingGoal ? goalSortOrder(rightSiblingGoal) : 999999;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return leftParts[index].localeCompare(rightParts[index], 'zh-CN');
    }
    if (leftParts.length !== rightParts.length) return leftParts.length - rightParts.length;
    const byOrder = goalSortOrder(left) - goalSortOrder(right);
    if (byOrder !== 0) return byOrder;
    return getGoalDisplayPath(left).localeCompare(getGoalDisplayPath(right), 'zh-CN');
  });
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
