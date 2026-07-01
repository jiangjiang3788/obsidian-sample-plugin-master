// GoalTemplateEditorModel is kept as the stable feature-level facade.
// V16 splits the implementation into cohesive model/* modules while preserving
// existing imports from './GoalTemplateEditorModel'.

export type { GoalTemplateEditMode, GoalTemplateDraftState, GoalTemplateThemeOption } from './model/GoalTemplateEditorTypes';
export { presetGranularityOptions } from './model/GoalTemplateEditorTypes';

export {
  cleanDisplayThemePath,
  cloneValue,
  compactText,
  ensureThemeField,
  mergeDefaultValues,
  normalizeThemePath,
  readThemePathFromFields,
  readThemePathFromTemplate,
  themeLeafLabel,
} from './model/GoalTemplateThemeModel';

export {
  buildDraftPeriodPolicy,
  buildInheritedDraft,
  inferTemplateDisplayName,
  isGeneratedPresetName,
  makeDraftFromTemplate,
  makeNewDraft,
  makeVariantId,
  readPeriodGranularity,
  switchDraftToOverride,
} from './model/GoalTemplateDraftModel';

export {
  buildDraftDiffSummary,
  buildInheritedTemplatePatchFromDraft,
  buildTemplatePatchFromDraft,
  inferTemplateEditMode,
} from './model/GoalTemplatePatchModel';

export {
  applyThemePathToDraft,
  buildThemeByPath,
  buildThemeOptions,
  createCopiedDraft,
  nextCopyVariantId,
  sortGoalTemplateVariants,
} from './model/GoalTemplateVariantModel';
