import type { GoalDefinition } from './types';
import type { GoalTemplate } from './templates';
import { compactText } from '@/core/semantics/text';
import { readOptionText as readOptionTextParts } from '@/core/semantics/option';

export interface GoalTemplateDisplayInfo {
  name: string;
  icon: string;
}

function readOptionText(value: unknown): string {
  return readOptionTextParts(value).value;
}


export function isGeneratedGoalTemplateName(_value: unknown): boolean {
  // Current model has no user-visible preset names; the cell identity is Goal × RecordType.
  return true;
}

/** @deprecated GoalTemplate no longer owns visual identity. Use Goal.icon. */
export function readGoalTemplateIcon(_template?: Partial<GoalTemplate> | null, fallbackIcon?: string): string {
  return compactText(fallbackIcon);
}

export function getGoalTemplateDisplayName(template?: Partial<GoalTemplate> | null, _goal?: GoalDefinition | null, fallback = '模板'): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return compactText(
    readOptionText(values.name)
    || readOptionText(values['名称'])
    || readOptionText(values['任务内容'])
    || readOptionText(values['内容'])
    || readOptionText(values.title)
    || fallback
  );
}

export function getGoalTemplateDisplayInfo(
  template?: Partial<GoalTemplate> | null,
  goal?: GoalDefinition | null,
  fallbackIcon?: string,
): GoalTemplateDisplayInfo {
  return {
    name: getGoalTemplateDisplayName(template, goal, '模板'),
    icon: readGoalTemplateIcon(template, fallbackIcon || goal?.icon),
  };
}
