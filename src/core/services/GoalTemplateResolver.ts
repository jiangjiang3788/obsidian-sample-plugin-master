import type { BlockTemplate, ThemeDefinition, ThinkSettings } from '@/core/types/schema';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { findGoalTemplate, resolveTemplatePeriodPolicy, splitGoalPath } from '@/core/goal';
import { getCoreBlockById, normalizeCoreBlockSettings } from '@/core/blocks';
import { ThemeMetadataResolver } from '@/core/themeMetadata';

export type GoalTemplateSourceType = 'core-block' | 'goal-template' | 'legacy-block' | null;

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  blockId: string;
  goalId?: string | null;
  goalPath?: string | null;
  themeId?: string | null;
  themePath?: string | null;
  templateVariantId?: string | null;
}


export interface GoalTemplateResolveResult {
  template: BlockTemplate | null;
  theme: ThemeDefinition | null;
  goal: GoalDefinition | null;
  templateId: string | null;
  templateSourceType: GoalTemplateSourceType;
  effectiveBlockId: string | null;
  templateVariantId?: string | null;
}

function findGoal(goalSettings: GoalSettings | undefined, goalId?: string | null, goalPath?: string | null): GoalDefinition | null {
  const goals = goalSettings?.goals || [];
  if (goalId) {
    const byId = goals.find((goal) => goal.id === goalId);
    if (byId) return byId;
  }
  const normalizedPath = splitGoalPath(goalPath || null).goalPath;
  if (!normalizedPath) return null;
  return goals.find((goal) => splitGoalPath(goal.goalPath || goal.title).goalPath === normalizedPath) || null;
}

function mergeTemplate(base: BlockTemplate, patch: Partial<BlockTemplate> & { defaultValues?: Record<string, unknown>; requiredFields?: string[]; granularity?: string }): BlockTemplate {
  const required = new Set(patch.requiredFields || []);
  const defaultValues = patch.defaultValues || {};
  const fields = (patch.fields ?? base.fields).map((field) => {
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
    outputTemplate: patch.outputTemplate ?? base.outputTemplate,
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
    const coreSettings = normalizeCoreBlockSettings(settings.coreBlockSettings, settings.inputSettings?.blocks || []);
    const effectiveBlockId = String(blockId || '').startsWith('core.') ? blockId : coreSettings.legacyBlockMap?.[blockId] || blockId;
    const goal = findGoal(settings.goalSettings, input.goalId, input.goalPath);
    const themePathFromId = input.themeId
      ? settings.inputSettings?.themes?.find((candidate) => candidate.id === input.themeId)?.path ?? null
      : null;
    const effectiveThemePath = input.themePath || goal?.themePath || themePathFromId || null;
    const theme = ThemeMetadataResolver.resolveThemeForRender(settings, effectiveThemePath);

    const coreBlock = getCoreBlockById(settings, effectiveBlockId);
    const legacyBase = settings.inputSettings?.blocks?.find((block) => block.id === blockId || block.id === effectiveBlockId) || null;

    // New main chain: Goal + Block. Theme is metadata only (icon/color/path), not a template selector.
    const baseTemplate = coreBlock || legacyBase;
    if (!baseTemplate) {
      // MIGRATION CLOSEOUT:
      // Runtime no longer falls back to Theme × Block override resolution.
      // After theme forms are migrated, the only allowed chain is:
      // GoalTemplate -> CoreBlock -> legacy base block. If even the base block
      // cannot be found, return an explicit empty result instead of silently
      // reviving removed theme-template overrides.
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

    if (coreBlock) {
      const policy = resolveTemplatePeriodPolicy(baseTemplate as any);
      const template = policy ? { ...(baseTemplate as any), periodPolicy: policy } : { ...(baseTemplate as any), periodPolicy: undefined, granularity: undefined };
      return { template, theme, goal, templateId: coreBlock.id, templateSourceType: 'core-block', effectiveBlockId, templateVariantId: null };
    }

    return { template: baseTemplate, theme, goal, templateId: legacyBase?.id || null, templateSourceType: 'legacy-block', effectiveBlockId, templateVariantId: null };
  }
}
