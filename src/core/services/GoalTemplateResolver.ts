import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { findGoalTemplate, isSystemRecordContextField, resolveTemplatePeriodPolicy } from '@/core/goal';
import { getCoreBlockById } from '@/core/blocks';
import { ThemeMetadataResolver } from '@/core/themeMetadata';

export type GoalTemplateSourceType = 'core-block' | 'goal-template' | null;

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  blockId: string;
  goalId?: string | null;
  themeId?: string | null;
  themePath?: string | null;
  templateVariantId?: string | null;
}


export interface GoalTemplateResolveResult {
  template: RecordCaptureTemplate | null;
  theme: ThemeDefinition | null;
  goal: GoalDefinition | null;
  templateId: string | null;
  templateSourceType: GoalTemplateSourceType;
  effectiveBlockId: string | null;
  templateVariantId?: string | null;
}

function findGoal(goalSettings: GoalSettings | undefined, goalId?: string | null): GoalDefinition | null {
  const id = String(goalId || '').trim();
  if (!id) return null;
  return (goalSettings?.goals || []).find((goal) => goal.id === id) || null;
}

function mergeTemplate(base: RecordCaptureTemplate, patch: Partial<RecordCaptureTemplate> & { defaultValues?: Record<string, unknown>; requiredFields?: string[]; granularity?: string }): RecordCaptureTemplate {
  const required = new Set(patch.requiredFields || []);
  const defaultValues = patch.defaultValues || {};
  const chosenFields = [...(patch.fields ?? base.fields)];

  // GoalTemplate can replace the visible field list, but system context fields (themePath, goalPath, etc.)
  // must survive as hidden data channels. Otherwise a preset-associated theme disappears simply because
  // the user removed the theme picker from the visible task form.
  for (const baseField of base.fields || []) {
    const isSystemContext = isSystemRecordContextField(baseField.key, baseField.label, String(baseField.semantic || baseField.semanticType || ''));
    if (!isSystemContext) continue;
    const exists = chosenFields.some((field) =>
      field.key === baseField.key
      || (field.label && baseField.label && field.label === baseField.label)
    );
    if (!exists) chosenFields.push(baseField);
  }

  const fields = chosenFields.map((field) => {
    const key = field.key || field.label;
    const defaultValue = defaultValues[key] ?? defaultValues[field.label || ''];
    return {
      ...field,
      ...(defaultValue !== undefined ? { defaultValue: String(defaultValue) } : null),
      ...(required.has(key) || required.has(field.label || '') ? { required: true } : null),
    } as any;
  });
  const merged = {
    ...base,
    fields,
    targetFile: patch.targetFile ?? base.targetFile,
    appendUnderHeader: patch.appendUnderHeader ?? base.appendUnderHeader,
    periodPolicy: (patch as any).periodPolicy ?? (base as any).periodPolicy,
  } as any;
  const policy = resolveTemplatePeriodPolicy(merged);
  if (policy) {
    merged.periodPolicy = policy;
  } else {
    delete merged.periodPolicy;
    delete merged.granularity;
  }
  return merged;
}

export class GoalTemplateResolver {
  static resolve(input: GoalTemplateResolveInput): GoalTemplateResolveResult {
    const { settings, blockId } = input;
    const effectiveBlockId = blockId;
    const goal = findGoal(settings.goalSettings, input.goalId);
    const themePathFromId = input.themeId
      ? settings.inputSettings?.themes?.find((candidate) => candidate.id === input.themeId)?.path ?? null
      : null;
    const effectiveThemePath = input.themePath || goal?.themePath || themePathFromId || null;
    const theme = ThemeMetadataResolver.resolveThemeForRender(settings, effectiveThemePath);

    const coreBlock = getCoreBlockById(settings, effectiveBlockId);

    // Single-user main chain: Goal + CoreBlock. Theme is metadata only (icon/color/path), not a template selector.
    const baseTemplate = coreBlock;
    if (!baseTemplate) {
      // 单人版收敛：运行时不再从旧 Block / ThemeOverride 回退。
      // 找不到 CoreBlock 时直接返回空结果，由调用方提示配置错误。
      return {
        template: null,
        theme,
        goal,
        templateId: null,
        templateSourceType: null,
        effectiveBlockId: null,
        templateVariantId: null,
      };
    }

    const goalTemplate = findGoalTemplate(settings.goalSettings, goal, effectiveBlockId, input.templateVariantId);
    if (goalTemplate) {
      return {
        template: mergeTemplate(baseTemplate, goalTemplate),
        theme,
        goal,
        templateId: goalTemplate.id,
        templateSourceType: 'goal-template',
        effectiveBlockId,
        templateVariantId: goalTemplate.variantId || 'default',
      };
    }

    const policy = resolveTemplatePeriodPolicy(baseTemplate as any);
    const template = policy ? { ...(baseTemplate as any), periodPolicy: policy } : { ...(baseTemplate as any), periodPolicy: undefined, granularity: undefined };
    return { template, theme, goal, templateId: baseTemplate.id, templateSourceType: 'core-block', effectiveBlockId, templateVariantId: null };
  }
}
