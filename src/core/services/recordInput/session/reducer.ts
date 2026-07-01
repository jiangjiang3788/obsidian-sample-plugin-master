import type {
  RecordInputDraftSnapshot,
  RecordInputSessionAction,
  RecordInputSessionState,
} from './types';
import { initializeRecordInputSession } from './initialize';
import {
  clearRecordInputGoalContext,
  preserveRecordInputBlockSwitchState,
  readRecordInputString,
} from './policy';

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

export function getRecordInputSessionDraft(state: RecordInputSessionState): RecordInputDraftSnapshot {
  return copyDraft({
    selectedGoalId: state.selectedGoalId,
    selectedGoalPath: state.selectedGoalPath,
    selectedTemplateVariantId: state.selectedTemplateVariantId,
    selectedThemeId: state.selectedThemeId,
    timeDirection: state.timeDirection,
    formData: state.formData,
    fieldSources: state.fieldSources,
  });
}

function withCachedCurrentDraft(state: RecordInputSessionState) {
  return {
    ...state.draftByBlockId,
    [state.currentBlockId]: getRecordInputSessionDraft(state),
  };
}

function commitDraft(
  state: RecordInputSessionState,
  draft: RecordInputDraftSnapshot,
  extra?: Partial<RecordInputSessionState>,
): RecordInputSessionState {
  const next: RecordInputSessionState = {
    ...state,
    ...extra,
    ...copyDraft(draft),
    dirty: true,
    revision: state.revision + 1,
  };
  return {
    ...next,
    draftByBlockId: {
      ...next.draftByBlockId,
      [next.currentBlockId]: getRecordInputSessionDraft(next),
    },
  };
}

function buildSwitchFallbackDraft(state: RecordInputSessionState): RecordInputDraftSnapshot {
  const preserved = preserveRecordInputBlockSwitchState(state.formData, state.fieldSources);
  return {
    formData: preserved.formData,
    fieldSources: preserved.fieldSources,
    selectedGoalId: readRecordInputString(preserved.formData, ['goalId', '目标ID']) ?? state.selectedGoalId,
    selectedGoalPath: readRecordInputString(preserved.formData, ['goalPath', '目标']) ?? state.selectedGoalPath,
    selectedTemplateVariantId: null,
    selectedThemeId: state.selectedThemeId,
    timeDirection: 'forward',
  };
}

export function reduceRecordInputSession(
  state: RecordInputSessionState,
  action: RecordInputSessionAction,
): RecordInputSessionState {
  switch (action.type) {
    case 'reset':
      return initializeRecordInputSession(action.payload);

    case 'setMode':
      if (action.mode === state.mode) return state;
      return {
        ...state,
        mode: action.mode,
        dirty: true,
        revision: state.revision + 1,
      };

    case 'switchRecordType': {
      const nextBlockId = String(action.blockId || '');
      if (!nextBlockId || nextBlockId === state.currentBlockId) return state;
      const cachedDrafts = withCachedCurrentDraft(state);
      const restored = cachedDrafts[nextBlockId]
        ? copyDraft(cachedDrafts[nextBlockId])
        : buildSwitchFallbackDraft(state);
      return commitDraft(
        {
          ...state,
          currentBlockId: nextBlockId,
          draftByBlockId: cachedDrafts,
        },
        restored,
        { currentBlockId: nextBlockId },
      );
    }

    case 'updateDraft': {
      return commitDraft(state, {
        formData: action.formData,
        fieldSources: action.fieldSources,
        selectedGoalId: action.selectedGoalId !== undefined ? action.selectedGoalId : state.selectedGoalId,
        selectedGoalPath: action.selectedGoalPath !== undefined ? action.selectedGoalPath : state.selectedGoalPath,
        selectedTemplateVariantId: action.selectedTemplateVariantId !== undefined
          ? action.selectedTemplateVariantId
          : state.selectedTemplateVariantId,
        selectedThemeId: action.selectedThemeId !== undefined ? action.selectedThemeId : state.selectedThemeId,
        timeDirection: action.timeDirection ?? state.timeDirection,
      });
    }

    case 'selectGoal': {
      return commitDraft(state, {
        formData: action.formData || state.formData,
        fieldSources: action.fieldSources || state.fieldSources,
        selectedGoalId: action.goalId,
        selectedGoalPath: action.goalPath,
        selectedTemplateVariantId: null,
        selectedThemeId: action.selectedThemeId !== undefined ? action.selectedThemeId : state.selectedThemeId,
        timeDirection: state.timeDirection,
      });
    }

    case 'clearGoalContext': {
      const cleared = clearRecordInputGoalContext(state.formData, state.fieldSources);
      return commitDraft(state, {
        formData: cleared.formData,
        fieldSources: cleared.fieldSources,
        selectedGoalId: null,
        selectedGoalPath: null,
        selectedTemplateVariantId: null,
        selectedThemeId: state.selectedThemeId,
        timeDirection: state.timeDirection,
      });
    }

    case 'selectTemplateVariant': {
      if ((action.variantId ?? null) === state.selectedTemplateVariantId) return state;
      return commitDraft(state, {
        formData: state.formData,
        fieldSources: state.fieldSources,
        selectedGoalId: state.selectedGoalId,
        selectedGoalPath: state.selectedGoalPath,
        selectedTemplateVariantId: action.variantId ?? null,
        selectedThemeId: state.selectedThemeId,
        timeDirection: state.timeDirection,
      });
    }

    case 'selectTheme': {
      if ((action.themeId ?? null) === state.selectedThemeId) return state;
      return commitDraft(state, {
        formData: state.formData,
        fieldSources: state.fieldSources,
        selectedGoalId: state.selectedGoalId,
        selectedGoalPath: state.selectedGoalPath,
        selectedTemplateVariantId: state.selectedTemplateVariantId,
        selectedThemeId: action.themeId ?? null,
        timeDirection: state.timeDirection,
      });
    }

    case 'changeTimeDirection': {
      return commitDraft(state, {
        formData: action.formData,
        fieldSources: action.fieldSources,
        selectedGoalId: state.selectedGoalId,
        selectedGoalPath: state.selectedGoalPath,
        selectedTemplateVariantId: state.selectedTemplateVariantId,
        selectedThemeId: state.selectedThemeId,
        timeDirection: action.timeDirection,
      });
    }

    case 'hydrateDefaults': {
      return commitDraft(state, {
        formData: action.formData,
        fieldSources: action.fieldSources,
        selectedGoalId: state.selectedGoalId,
        selectedGoalPath: state.selectedGoalPath,
        selectedTemplateVariantId: state.selectedTemplateVariantId,
        selectedThemeId: state.selectedThemeId,
        timeDirection: state.timeDirection,
      });
    }

    default:
      return state;
  }
}
