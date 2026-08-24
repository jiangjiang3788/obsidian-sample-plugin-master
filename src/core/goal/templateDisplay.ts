import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { GoalDefinition } from './types';
import type { GoalTemplate } from './templates';
import { compactText } from '@/core/semantics/text';
import { isIconTemplateField } from '@/core/fields/fieldTokenSemantics';
import { readOptionText as readOptionTextParts } from '@/core/semantics/option';

export interface GoalTemplateDisplayInfo {
  name: string;
  icon: string;
}

function readOptionText(value: unknown): string {
  return readOptionTextParts(value).value;
}

function readFieldDefault(fields: TemplateField[] | undefined, predicate: (field: TemplateField) => boolean): string {
  for (const field of fields || []) {
    if (!predicate(field)) continue;
    const value = readOptionText((field as any).defaultValue);
    if (value) return value;
  }
  return '';
}

export function isGeneratedGoalTemplateName(_value: unknown): boolean {
  // Current model has no user-visible preset names; the cell identity is Goal × RecordType.
  return true;
}

export function readGoalTemplateIcon(template?: Partial<GoalTemplate> | null, fallbackIcon?: string): string {
  const values = (template?.defaultValues || {}) as Record<string, unknown>;
  return compactText(
    readOptionText(values.icon)
    || readOptionText(values['图标'])
    || readFieldDefault(template?.fields as TemplateField[] | undefined, isIconTemplateField)
    || fallbackIcon
  );
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
