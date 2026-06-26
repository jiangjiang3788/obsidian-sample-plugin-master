import type { CoreBlockDefinition } from '@/core/blocks';
import type { GoalDefinition } from './types';
import type { GoalTemplate } from './templates';
import { compactGoalTemplateForStorage } from './templateVariantDiff';

export type GoalTemplateEditMode = 'inherit' | 'override' | 'disabled';

function compactText(value: unknown): string {
  return String(value ?? '').trim();
}

const SYSTEM_DISPLAY_DEFAULT_KEYS = new Set(['themePath', '主题', 'icon', '图标']);

export function goalTemplateHasCustomOverrides(
  template: GoalTemplate | null | undefined,
  coreBlock: Pick<CoreBlockDefinition, 'id' | 'fields' | 'outputTemplate' | 'targetFile' | 'appendUnderHeader' | 'periodPolicy'> | null | undefined,
  goal?: Pick<GoalDefinition, 'themePath'> | null,
): boolean {
  if (!template || !coreBlock || template.enabled === false) return false;
  const patch = compactGoalTemplateForStorage(template, { coreBlock, goal });
  if (patch.fields?.length) return true;
  if (compactText(patch.outputTemplate)) return true;
  if (compactText(patch.targetFile)) return true;
  if (compactText(patch.appendUnderHeader)) return true;
  if (patch.requiredFields?.length) return true;
  const customDefaultKeys = Object.keys(patch.defaultValues || {}).filter((key) => !SYSTEM_DISPLAY_DEFAULT_KEYS.has(key));
  return customDefaultKeys.length > 0;
}

export function inferGoalTemplateEditMode(
  template: GoalTemplate | null | undefined,
  coreBlock: Pick<CoreBlockDefinition, 'id' | 'fields' | 'outputTemplate' | 'targetFile' | 'appendUnderHeader' | 'periodPolicy'> | null | undefined,
  goal?: Pick<GoalDefinition, 'themePath'> | null,
): GoalTemplateEditMode {
  if (template?.enabled === false) return 'disabled';
  return goalTemplateHasCustomOverrides(template, coreBlock, goal) ? 'override' : 'inherit';
}
