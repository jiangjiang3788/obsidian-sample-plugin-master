import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalTemplate } from '@core/goal/public';
import { isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity } from '@core/goal/public';
import type { GoalTemplateDraftState } from './GoalTemplateEditorTypes';
import { deriveRequiredFields } from './GoalTemplateFieldModel';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function readPeriodGranularity(
  template: GoalTemplate | null | undefined,
  block: CoreBlockDefinition | null | undefined,
): GoalTemplateDraftState['granularity'] {
  return normalizePeriodPolicyGranularity(
    template?.periodPolicy?.granularity
      || block?.periodPolicy?.granularity
      || 'week',
  );
}

export function buildDraftPeriodPolicy(
  block: CoreBlockDefinition | null | undefined,
  draft: Pick<GoalTemplateDraftState, 'granularity'>,
) {
  if (!block || !isPeriodAwareCoreBlock(block.id)) return undefined;
  return { enabled: true, granularity: normalizePeriodPolicyGranularity(draft.granularity) };
}

export function makeDraftFromTemplate(
  template: GoalTemplate | null,
  block: CoreBlockDefinition | null,
): GoalTemplateDraftState {
  const fields = cloneValue(template?.fields || block?.fields || []);
  return {
    description: template?.description || '',
    granularity: readPeriodGranularity(template, block),
    fields,
    targetFile: template?.targetFile || block?.targetFile || '',
    appendUnderHeader: template?.appendUnderHeader || block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: cloneValue(template?.requiredFields || deriveRequiredFields(fields)),
    defaultValues: cloneValue(template?.defaultValues || {}),
  };
}

export function makeNewDraft(block: CoreBlockDefinition | null): GoalTemplateDraftState {
  return makeDraftFromTemplate(null, block);
}

export function buildInheritedDraft(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const fields = cloneValue(block?.fields || []);
  return {
    ...previous,
    fields,
    targetFile: block?.targetFile || '',
    appendUnderHeader: block?.appendUnderHeader || '## {{goalPath}}',
    requiredFields: deriveRequiredFields(fields),
    defaultValues: {},
  };
}

export function switchDraftToOverride(previous: GoalTemplateDraftState, block: CoreBlockDefinition | null): GoalTemplateDraftState {
  const base = buildInheritedDraft(previous, block);
  return {
    ...previous,
    fields: previous.fields?.length ? previous.fields : base.fields,
    targetFile: previous.targetFile || base.targetFile,
    appendUnderHeader: previous.appendUnderHeader || base.appendUnderHeader,
    requiredFields: previous.requiredFields?.length ? previous.requiredFields : base.requiredFields,
  };
}
