// src/core/recordInput/public.ts
/**
 * Record input domain public facade.
 *
 * This facade owns the stable record-input surface after V23 moved the domain
 * out of the generic core/services bucket. App/features/platform code should
 * use this module-level facade instead of deep-importing record-input internals.
 */
export * from '../types/recordInput';
export * from '../types/recordSnapshot';

export * from './session/types';
export { applyRecordGoalContext, resolveRecordGoalPath } from './systemContext';
export { initializeRecordInputSession } from './session/initialize';
export { getRecordInputSessionDraft, reduceRecordInputSession } from './session/reducer';
export { preserveRecordInputRecordTypeSwitchState, clearRecordInputGoalContext, RECORD_INPUT_RECORD_TYPE_SWITCH_PRESERVE_KEYS, RECORD_INPUT_GOAL_CONTEXT_KEYS, isRecordInputMeaningfulValue, isRecordInputOptionLike, isRecordInputRefreshableSource, isRecordInputSameValue, readRecordInputString } from './session/policy';
export * from './submitResult';
export * from './refreshCoordinator';
export * from './mutationErrors';
export { resolveContinuationAfterCreate, resolveTaskCompletionContinuation } from './followUp/taskCompletionContinuation';
export * from './feedback';
export * from './recovery';
export * from './debug';
export * from './mutation/HeaderAppender';
export { buildRecordOutputPlan, buildRecordPersistencePlan } from './snapshot/OutputPlanner';
export * from './RecordInputFacade';
export { RecordInputKernel } from './RecordInputKernel';

export { GoalTemplateResolver, getCreateAvailableRecordTypes, getCreateEligibleGoalPaths } from '../services/GoalTemplateResolver';
export type { GoalTemplateResolveInput, GoalTemplateResolveResult, GoalTemplateResolveStatus, GoalTemplateSourceType } from '../services/GoalTemplateResolver';
