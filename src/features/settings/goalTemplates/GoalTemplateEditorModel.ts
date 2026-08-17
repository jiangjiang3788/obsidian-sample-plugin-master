// GoalTemplate editor facade for the Goal-only single-template model.
export type { GoalTemplateEditMode, GoalTemplateDraftState, GoalTemplateSelectOption } from './model/GoalTemplateEditorTypes';
export { presetGranularityOptions } from './model/GoalTemplateEditorTypes';

export {
  buildDraftPeriodPolicy,
  buildInheritedDraft,
  makeDraftFromTemplate,
  makeNewDraft,
  readPeriodGranularity,
  switchDraftToOverride,
} from './model/GoalTemplateDraftModel';

export {
  buildDisabledTemplate,
  buildDraftDiffSummary,
  buildTemplatePatchFromDraft,
  inferTemplateEditMode,
} from './model/GoalTemplatePatchModel';
