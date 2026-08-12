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
export { initializeRecordInputSession } from './session/initialize';
export { getRecordInputSessionDraft, reduceRecordInputSession } from './session/reducer';
export { preserveRecordInputBlockSwitchState, clearRecordInputGoalContext, RECORD_INPUT_BLOCK_SWITCH_PRESERVE_KEYS, RECORD_INPUT_GOAL_CONTEXT_KEYS, isRecordInputMeaningfulValue, isRecordInputOptionLike, isRecordInputRefreshableSource, isRecordInputSameValue, readRecordInputString } from './session/policy';
export * from './submitResult';
export * from './refreshCoordinator';
export * from './mutationErrors';
export * from './feedback';
export * from './recovery';
export * from './debug';
export * from './mutation/HeaderAppender';
export { buildRecordOutputPlan, buildRecordPersistencePlan } from './snapshot/OutputPlanner';
export * from './RecordInputFacade';
export { RecordInputKernel } from './RecordInputKernel';

export { GoalTemplateResolver } from '../services/GoalTemplateResolver';
export type { GoalTemplateResolveInput, GoalTemplateResolveResult, GoalTemplateSourceType } from '../services/GoalTemplateResolver';
