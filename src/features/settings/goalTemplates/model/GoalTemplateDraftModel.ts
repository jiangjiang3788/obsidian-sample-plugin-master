import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalTemplate } from '@core/goal/public';
import { isPeriodAwareRecordType, normalizePeriodPolicyGranularity, stripGoalTemplateIconDefaults, stripGoalTemplateIconFieldDefaults } from '@core/goal/public';
import type { GoalTemplateDraftState } from './GoalTemplateEditorTypes';
import { applyGoalTemplateDefaultValuesToFields, deriveRequiredFields } from './GoalTemplateFieldModel';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function readPeriodGranularity(
  template: GoalTemplate | null | undefined,
  block: TemplateRecordTypeDefinition | null | undefined,
): GoalTemplateDraftState['granularity'] {
  return normalizePeriodPolicyGranularity(
    template?.periodPolicy?.granularity
      || block?.periodPolicy?.granularity
      || 'week',
  );
}

export function buildDraftPeriodPolicy(
  block: TemplateRecordTypeDefinition | null | undefined,
  draft: Pick<GoalTemplateDraftState, 'granularity'>,
) {
  if (!block || !isPeriodAwareRecordType(block.id)) return undefined;
  return { enabled: true, granularity: normalizePeriodPolicyGranularity(draft.granularity) };
}

export function makeDraftFromTemplate(
  template: GoalTemplate | null,
  block: TemplateRecordTypeDefinition | null,
): GoalTemplateDraftState {
  const baseFields = cloneValue(stripGoalTemplateIconFieldDefaults(template?.fields || block?.fields || []) || []);
  const defaults = cloneValue(stripGoalTemplateIconDefaults(template?.defaultValues) || {});
  const fields = applyGoalTemplateDefaultValuesToFields(baseFields, defaults);
  return {
    description: template?.description || '',
    granularity: readPeriodGranularity(template, block),
    fields,
    targetFile: template?.targetFile || block?.targetFile || '',
    appendUnderHeader: template?.appendUnderHeader || block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: cloneValue(template?.requiredFields || deriveRequiredFields(fields)),
    defaultValues: defaults,
  };
}

export function makeNewDraft(block: TemplateRecordTypeDefinition | null): GoalTemplateDraftState {
  return makeDraftFromTemplate(null, block);
}

export function buildDefaultDraft(previous: GoalTemplateDraftState, block: TemplateRecordTypeDefinition | null): GoalTemplateDraftState {
  const fields = cloneValue(stripGoalTemplateIconFieldDefaults(block?.fields || []) || []);
  return {
    ...previous,
    fields,
    targetFile: block?.targetFile || '',
    appendUnderHeader: block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: deriveRequiredFields(fields),
    defaultValues: {},
  };
}

export function switchDraftToOverride(previous: GoalTemplateDraftState, block: TemplateRecordTypeDefinition | null): GoalTemplateDraftState {
  const base = buildDefaultDraft(previous, block);
  return {
    ...previous,
    fields: previous.fields?.length ? previous.fields : base.fields,
    targetFile: previous.targetFile || base.targetFile,
    appendUnderHeader: previous.appendUnderHeader || base.appendUnderHeader,
    requiredFields: previous.requiredFields?.length ? previous.requiredFields : base.requiredFields,
  };
}
