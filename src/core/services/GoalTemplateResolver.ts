import type { RecordCaptureTemplate } from '@/core/recordInput/CaptureTemplate';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { applyGoalIconToCaptureFields, findDirectGoalTemplate, getGoalTemplates, normalizeGoalPath, resolveTemplatePeriodPolicy } from '@/core/goal';
import { getEffectiveRecordTypes, getTemplateRecordTypeById, type RecordTypeDefinition } from '@/core/recordTypes/public';

export type GoalTemplateSourceType = 'record-type' | 'goal-template' | null;
export type GoalTemplateResolveStatus = 'available' | 'disabled' | 'goal-required' | 'missing-goal-template' | 'unknown-record-type';

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  /** Canonical RecordType id (for example core.habit). */
  recordTypeId?: string | null;
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
  effectiveRecordTypeId: string | null;
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

/**
 * Canonical create-surface RecordType resolver.
 *
 * This is the single source used by QuickInput and post-submit Continuation:
 * - presentation/order comes from the RecordType registry;
 * - direct capture types remain available without GoalTemplate rows;
 * - template capture types are available only when an enabled template exists;
 * - when a Goal is selected, the template must belong to that exact Goal.
 */
export function getCreateAvailableRecordTypes(
  settings: ThinkSettings,
  goalPath?: string | null,
): RecordTypeDefinition[] {
  const selectedGoalPath = normalizeGoalPath(goalPath) || '';
  return getEffectiveRecordTypes().filter((recordType) => {
    if (recordType.captureMode === 'direct') return true;
    const eligibleGoalPaths = getCreateEligibleGoalPaths(settings, recordType.id);
    return selectedGoalPath
      ? eligibleGoalPaths.includes(selectedGoalPath)
      : eligibleGoalPaths.length > 0;
  });
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
  },
): RecordCaptureTemplate {
  const required = new Set(patch.requiredFields || []);
  const defaultValues = patch.defaultValues || {};
  const isTaskTemplate = String(base.recordTypeId || base.id || '').replace(/^core\./, '') === 'task';
  const fields = [...(patch.fields ?? base.fields ?? [])].map((field) => {
    const key = field.key || field.label;
    const defaultValue = defaultValues[key] ?? defaultValues[field.label || ''];
    const mergedField = {
      ...field,
      ...(defaultValue !== undefined ? { defaultValue: String(defaultValue) } : null),
      ...(required.has(key) || required.has(field.label || '') ? { required: true } : null),
    };

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
    periodPolicy: patch.periodPolicy ?? base.periodPolicy,
  } as RecordCaptureTemplate;
  const policy = resolveTemplatePeriodPolicy(merged);
  if (policy) merged.periodPolicy = policy;
  else {
    delete merged.periodPolicy;
  }
  return merged;
}

function applyGoalIdentityIcon(template: RecordCaptureTemplate, goal: GoalDefinition | null): RecordCaptureTemplate {
  const fields = applyGoalIconToCaptureFields(template.fields, goal) ?? template.fields;
  return fields === template.fields ? template : { ...template, fields };
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
    const recordTypeId = String(input.recordTypeId || '').trim();
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
        effectiveRecordTypeId: null,
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
        effectiveRecordTypeId: recordTypeId,
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
        effectiveRecordTypeId: recordTypeId,
      };
    }

    if (direct) {
      return {
        status: 'available',
        template: applyGoalIdentityIcon(mergeTemplate(baseTemplate, direct), goal),
        goal,
        templateId: direct.id,
        templateSourceType: 'goal-template',
        recordTypeId,
        effectiveRecordTypeId: recordTypeId,
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
        effectiveRecordTypeId: recordTypeId,
      };
    }

    const policy = resolveTemplatePeriodPolicy(baseTemplate);
    const baseResolved: RecordCaptureTemplate = { ...baseTemplate };
    if (policy) baseResolved.periodPolicy = policy;
    else delete baseResolved.periodPolicy;
    const template = applyGoalIdentityIcon(baseResolved, goal);
    return {
      status: 'available',
      template,
      goal,
      templateId: baseTemplate.id,
      templateSourceType: 'record-type',
      recordTypeId,
      effectiveRecordTypeId: recordTypeId,
    };
  }
}
