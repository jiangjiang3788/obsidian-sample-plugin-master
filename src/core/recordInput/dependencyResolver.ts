import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';
import { getTemplateRecordTypeById } from '@/core/recordTypes/public';
import type { RecordSubmitIssue, ResolveDependenciesResult } from '@/core/types/recordInput';
import { resolveRecordGoalPath } from './systemContext';

export interface DependencyResolverInput {
  settings: ThinkSettings;
  recordTypeId?: string | null;
  item?: RecordViewItem | null;
  context?: Record<string, unknown> | null;
  requireDirectGoalTemplate?: boolean;
}

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

export function resolveRecordDependencies(input: DependencyResolverInput): ResolveDependenciesResult {
  const warnings: RecordSubmitIssue[] = [];
  const errors: RecordSubmitIssue[] = [];
  const fullSettings = input.settings;
  const requestedRecordTypeId = input.recordTypeId ? String(input.recordTypeId) : null;
  const goalPath = resolveRecordGoalPath({ context: input.context, item: input.item });

  if (!requestedRecordTypeId) {
    errors.push(issue('record_type_missing', 'Missing recordTypeId for record submission.', 'recordTypeId'));
    return {
      recordTypeId: null,
      template: null,
      warnings,
      errors,
      meta: { templateId: null, templateSourceType: null, usedFallbackRecordType: false },
    };
  }

  const recordType = getTemplateRecordTypeById(requestedRecordTypeId);
  if (!recordType) {
    errors.push(issue('record_type_not_found', 'Selected RecordType no longer exists.', 'recordTypeId'));
    return {
      recordTypeId: requestedRecordTypeId,
      template: null,
      warnings,
      errors,
      meta: { templateId: null, templateSourceType: null, usedFallbackRecordType: false },
    };
  }

  const resolved = GoalTemplateResolver.resolve({
    settings: fullSettings,
    recordTypeId: requestedRecordTypeId,
    goalPath,
    requireDirectGoalTemplate: input.requireDirectGoalTemplate === true,
  });

  if (resolved.status === 'disabled') {
    errors.push(issue('record_goal_record_type_disabled', 'This RecordType is disabled for the selected Goal.', 'goalPath'));
    return {
      recordTypeId: requestedRecordTypeId,
      template: null,
      warnings,
      errors,
      meta: { templateId: resolved.templateId, templateSourceType: resolved.templateSourceType, usedFallbackRecordType: false },
    };
  }

  if (resolved.status === 'goal-required') {
    errors.push(issue('record_goal_required', 'Select a Goal with a configured template before creating this record.', 'goalPath'));
  } else if (resolved.status === 'missing-goal-template') {
    errors.push(issue('record_goal_template_missing', 'The selected Goal has no configured template for this RecordType.', 'goalPath'));
  }

  if (resolved.template) {
    return {
      recordTypeId: resolved.recordTypeId || requestedRecordTypeId,
      template: resolved.template,
      warnings,
      errors,
      meta: {
        templateId: resolved.templateId,
        templateSourceType: resolved.templateSourceType,
        usedFallbackRecordType: false,
      },
    };
  }

  errors.push(issue('record_template_missing', 'No effective Goal + RecordType template is available for this record.', 'recordTypeId'));
  return {
    recordTypeId: requestedRecordTypeId,
    template: null,
    warnings,
    errors,
    meta: { templateId: null, templateSourceType: null, usedFallbackRecordType: false },
  };
}
