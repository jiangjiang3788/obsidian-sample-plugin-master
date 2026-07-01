import type {
  InitializeRecordInputSessionInput,
  RecordInputDraftSnapshot,
  RecordInputSessionSelection,
  RecordInputSessionState,
} from './types';

function copyDraft(draft: RecordInputDraftSnapshot): RecordInputDraftSnapshot {
  return {
    selectedGoalId: draft.selectedGoalId,
    selectedGoalPath: draft.selectedGoalPath,
    selectedTemplateVariantId: draft.selectedTemplateVariantId,
    selectedThemeId: draft.selectedThemeId,
    timeDirection: draft.timeDirection,
    formData: { ...draft.formData },
    fieldSources: { ...draft.fieldSources },
  };
}

export function createRecordInputDraftSnapshot(
  input: InitializeRecordInputSessionInput,
): RecordInputDraftSnapshot {
  const selection: Partial<RecordInputSessionSelection> = input.initialSelection || {};
  return {
    selectedGoalId: selection.selectedGoalId ?? null,
    selectedGoalPath: selection.selectedGoalPath ?? null,
    selectedTemplateVariantId: selection.selectedTemplateVariantId ?? null,
    selectedThemeId: selection.selectedThemeId ?? input.initialThemeId ?? null,
    timeDirection: selection.timeDirection ?? 'forward',
    formData: { ...(input.initialFormData || {}) },
    fieldSources: { ...(input.initialFieldSources || {}) },
  };
}

export function initializeRecordInputSession(
  input: InitializeRecordInputSessionInput,
): RecordInputSessionState {
  const initialBlockId = String(input.initialBlockId || '');
  const draft = createRecordInputDraftSnapshot(input);
  return {
    mode: input.mode || 'create',
    currentBlockId: initialBlockId,
    originBlockId: initialBlockId,
    ...copyDraft(draft),
    draftByBlockId: {
      [initialBlockId]: copyDraft(draft),
    },
    dirty: false,
    revision: 0,
  };
}
