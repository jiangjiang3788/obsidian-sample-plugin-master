import type { TemplateRecordTypeDefinition } from '@/core/recordTypes/public';
import type { GoalTemplate } from './templates';
import { compactGoalTemplateForStorage } from './templateOverrideDiff';
import { compactText } from '@/core/semantics/text';

export type GoalTemplateEditMode = 'default' | 'override' | 'disabled';

export function goalTemplateHasCustomOverrides(
  template: GoalTemplate | null | undefined,
  recordType: Pick<TemplateRecordTypeDefinition, 'id' | 'fields' | 'targetFile' | 'appendUnderHeader' | 'periodPolicy'> | null | undefined,
): boolean {
  if (!template || !recordType || template.enabled === false) return false;
  const patch = compactGoalTemplateForStorage(template, { recordType });
  if (patch.fields?.length) return true;
  if (compactText(patch.targetFile)) return true;
  if (compactText(patch.appendUnderHeader)) return true;
  if (patch.requiredFields?.length) return true;
  return Object.keys(patch.defaultValues || {}).length > 0;
}

export function inferGoalTemplateEditMode(
  template: GoalTemplate | null | undefined,
  recordType: Pick<TemplateRecordTypeDefinition, 'id' | 'fields' | 'targetFile' | 'appendUnderHeader' | 'periodPolicy'> | null | undefined,
): GoalTemplateEditMode {
  if (template?.enabled === false) return 'disabled';
  return goalTemplateHasCustomOverrides(template, recordType) ? 'override' : 'default';
}
