import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { findDirectGoalTemplate, getGoalTemplates, normalizeGoalPath, resolveTemplatePeriodPolicy } from '@/core/goal';
import { getTemplateRecordTypeById } from '@/core/recordTypes/public';

export type GoalTemplateSourceType = 'record-type' | 'goal-template' | null;
export type GoalTemplateResolveStatus = 'available' | 'disabled' | 'goal-required' | 'missing-goal-template' | 'unknown-record-type';

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  /** Canonical RecordType id (for example core.habit). */
  recordTypeId?: string | null;
  /** @deprecated 1.0.64 internal callers should pass recordTypeId. */
  blockId?: string | null;
  /** Canonical slash path. Goal has no second identity. */
  goalPath?: string | null;
  /** Create flows require an enabled direct Goal x RecordType template. Edit/settings flows may still use the RecordType base. */
  requireDirectGoalTemplate?: boolean;
}

export interface GoalTemplateResolveResult {
  status: GoalTemplateResolveStatus;
  template: RecordCaptureTemplate | null;
  goal: GoalDefinition | null;
  templateId: string | null;
  templateSourceType: GoalTemplateSourceType;
  recordTypeId: string | null;
  /** @deprecated alias kept only while non-capture call sites finish renaming. */
  effectiveBlockId: string | null;
}


export function getCreateEligibleGoalPaths(settings: ThinkSettings, recordTypeId: string): string[] {
  const id = String(recordTypeId || '').trim();
  if (!id) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const template of getGoalTemplates(settings.goalSettings)) {
    if (template.recordTypeId !== id || template.enabled === false) continue;
    const path = normalizeGoalPath(template.goalPath);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    result.push(path);
  }
  return result;
}

function findGoal(goalSettings: GoalSettings | undefined, goalPath?: string | null): GoalDefinition | null {
  const path = String(goalPath || '').trim();
  if (!path) return null;
  return (goalSettings?.goals || []).find((goal) => goal.path === path) || null;
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
  const isTaskTemplate = String(base.recordTypeId || base.id || '').replace(/^core\./, '') === 'task';
  const fields = [...(patch.fields ?? base.fields)].map((field) => {
    const key = field.key || field.label;
    const defaultValue = defaultValues[key] ?? defaultValues[field.label || ''];
    const mergedField = {
      ...field,
      ...(defaultValue !== undefined ? { defaultValue: String(defaultValue) } : null),
      ...(required.has(key) || required.has(field.label || '') ? { required: true } : null),
    } as any;

    // Domain invariant: Task expected duration is optional. Goal templates may provide a
    // default, but cannot turn it into a persistence requirement for open/unexecuted tasks.
    if (isTaskTemplate && ['expectedDurationMinutes', '预计时长', '时长', '时长（分钟）'].includes(String(key || ''))) {
      mergedField.required = false;
    }
    return mergedField;
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

/**
 * Single capture-template resolver.
 *
 * RecordType supplies the structural base. Create flows may require an enabled
 * direct Goal × RecordType template; when required, absence is unavailable
 * rather than a RecordType-default fallback. Edit/settings flows can still use
 * the base. There is no ancestor inheritance or feature-specific resolver.
 */
export class GoalTemplateResolver {
  static resolve(input: GoalTemplateResolveInput): GoalTemplateResolveResult {
    const settings = input.settings;
    const recordTypeId = String(input.recordTypeId || input.blockId || '').trim();
    const goal = findGoal(settings.goalSettings, input.goalPath);
    const baseTemplate = getTemplateRecordTypeById(recordTypeId);
    if (!baseTemplate) {
      return {
        status: 'unknown-record-type',
        template: null,
        goal,
        templateId: null,
        templateSourceType: null,
        recordTypeId: null,
        effectiveBlockId: null,
      };
    }

    const direct = input.goalPath
      ? findDirectGoalTemplate(settings.goalSettings, input.goalPath, recordTypeId)
      : null;

    if (input.requireDirectGoalTemplate && !input.goalPath) {
      return {
        status: 'goal-required',
        template: null,
        goal,
        templateId: null,
        templateSourceType: null,
        recordTypeId,
        effectiveBlockId: recordTypeId,
      };
    }

    if (direct?.enabled === false) {
      return {
        status: 'disabled',
        template: null,
        goal,
        templateId: direct.id,
        templateSourceType: 'goal-template',
        recordTypeId,
        effectiveBlockId: recordTypeId,
      };
    }

    if (direct) {
      return {
        status: 'available',
        template: mergeTemplate(baseTemplate, direct),
        goal,
        templateId: direct.id,
        templateSourceType: 'goal-template',
        recordTypeId,
        effectiveBlockId: recordTypeId,
      };
    }

    if (input.requireDirectGoalTemplate) {
      return {
        status: 'missing-goal-template',
        template: null,
        goal,
        templateId: null,
        templateSourceType: null,
        recordTypeId,
        effectiveBlockId: recordTypeId,
      };
    }

    const policy = resolveTemplatePeriodPolicy(baseTemplate as any);
    const template = policy
      ? { ...(baseTemplate as any), periodPolicy: policy }
      : { ...(baseTemplate as any), periodPolicy: undefined, granularity: undefined };
    return {
      status: 'available',
      template,
      goal,
      templateId: baseTemplate.id,
      templateSourceType: 'record-type',
      recordTypeId,
      effectiveBlockId: recordTypeId,
    };
  }
}
