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

function normalizePath(value?: string | null): string {
  return String(value || '').split('/').map((part) => part.trim()).filter(Boolean).join('/');
}

export function getGoalDisplayPath(goal: GoalDefinition): string {
  return normalizePath(goal.goalPath || goal.title || goal.id) || goal.id;
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
  return [...goals].sort((left, right) => getGoalDisplayPath(left).localeCompare(getGoalDisplayPath(right), 'zh-CN'));
}

export function buildGoalTemplateCell(goal: GoalDefinition, block: CoreBlockDefinition, templates: GoalTemplate[]): GoalTemplateCellModel {
  const cellTemplates = templates.filter((template) => template.goalId === goal.id && template.coreBlockId === block.id);
  const enabledTemplates = cellTemplates.filter((template) => template.enabled !== false);
  const defaultCount = enabledTemplates.filter((template) => template.isDefault).length;
  let status: GoalTemplateCellStatus = 'inherit';
  let label = '默认';
  let description = '继承 Block 默认记录方式';

  if (cellTemplates.length > 0 && enabledTemplates.length === 0) {
    status = 'disabled';
    label = '隐藏';
    description = '该目标下隐藏此 Block';
  } else if (defaultCount > 1 || (enabledTemplates.length > 1 && defaultCount === 0)) {
    status = 'warning';
    label = '异常';
    description = defaultCount > 1 ? '存在多个默认预设' : '多个显示预设但没有默认预设';
  } else if (enabledTemplates.length > 1) {
    status = 'multi';
    label = `多预设 ${enabledTemplates.length}`;
    description = '该目标下有多个记录预设';
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
