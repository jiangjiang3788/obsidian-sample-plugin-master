import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { findGoalTemplate, resolveTemplatePeriodPolicy } from '@/core/goal';
import { getCoreBlockById } from '@/core/blocks';

export type GoalTemplateSourceType = 'core-block' | 'goal-template' | null;

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  blockId: string;
  /** Canonical slash path. Goal has no second identity. */
  goalPath?: string | null;
}

export interface GoalTemplateResolveResult {
  template: RecordCaptureTemplate | null;
  goal: GoalDefinition | null;
  templateId: string | null;
  templateSourceType: GoalTemplateSourceType;
  effectiveBlockId: string | null;
}

function findGoal(goalSettings: GoalSettings | undefined, goalPath?: string | null): GoalDefinition | null {
  const path = String(goalPath || '').trim();
  if (!path) return null;
  return (goalSettings?.goals || []).find((goal) => (goal.path) === path) || null;
}

function mergeTemplate(
  base: RecordCaptureTemplate,
  patch: Partial<RecordCaptureTemplate> & {
    defaultValues?: Record<string, unknown>;
    requiredFields?: string[];
    periodPolicy?: unknown;
  },
): RecordCaptureTemplate {
  const required = new Set(patch.requiredFields || []);
  const defaultValues = patch.defaultValues || {};
  const fields = [...(patch.fields ?? base.fields)].map((field) => {
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
  if (policy) merged.periodPolicy = policy;
  else {
    delete merged.periodPolicy;
    delete merged.granularity;
  }
  return merged;
}

export class GoalTemplateResolver {
  static resolve(input: GoalTemplateResolveInput): GoalTemplateResolveResult {
    const { settings, blockId } = input;
    const effectiveBlockId = blockId;
    const goal = findGoal(settings.goalSettings, input.goalPath);
    const baseTemplate = getCoreBlockById(settings, effectiveBlockId);
    if (!baseTemplate) {
      return {
        template: null,
        goal,
        templateId: null,
        templateSourceType: null,
        effectiveBlockId: null,
      };
    }

    // Exactly one template per Goal path x CoreBlock. Child Goals inherit the
    // nearest configured parent only when they do not own a direct template.
    const goalTemplate = findGoalTemplate(settings.goalSettings, goal, effectiveBlockId);
    if (goalTemplate) {
      return {
        template: mergeTemplate(baseTemplate, goalTemplate),
        goal,
        templateId: goalTemplate.id,
        templateSourceType: 'goal-template',
        effectiveBlockId,
      };
    }

    const policy = resolveTemplatePeriodPolicy(baseTemplate as any);
    const template = policy
      ? { ...(baseTemplate as any), periodPolicy: policy }
      : { ...(baseTemplate as any), periodPolicy: undefined, granularity: undefined };
    return {
      template,
      goal,
      templateId: baseTemplate.id,
      templateSourceType: 'core-block',
      effectiveBlockId,
    };
  }
}
