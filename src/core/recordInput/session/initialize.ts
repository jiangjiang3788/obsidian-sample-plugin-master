import type {
  InitializeRecordInputSessionInput,
  RecordInputDraftSnapshot,
  RecordInputSessionSelection,
  RecordInputSessionState,
} from './types';

function copyDraft(draft: RecordInputDraftSnapshot): RecordInputDraftSnapshot {
  return {
    selectedGoalPath: draft.selectedGoalPath,
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
    selectedGoalPath: selection.selectedGoalPath ?? null,
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
    draftByBlockId: { [initialBlockId]: copyDraft(draft) },
    dirty: false,
    revision: 0,
  };
}
