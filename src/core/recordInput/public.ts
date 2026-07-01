// src/core/recordInput/public.ts
/**
 * Record input domain public facade.
 *
 * This facade groups the stable record-input planning, session, mutation, and
 * submit-result APIs. It lets future app/usecase code depend on a narrower
 * domain surface than the root `@core/public` compatibility facade.
 */
export * from '../types/recordInput';
export * from '../types/recordSnapshot';
export * from '../services/recordInput/session';
export * from '../services/recordInput/submitResult';
export * from '../services/recordInput/refreshCoordinator';
export * from '../services/recordInput/mutationErrors';
export * from '../services/recordInput/mutation/HeaderAppender';
export * from '../services/recordInput/mutation/TaskLinePatch';
export { buildRecordOutputPlan, buildRecordPersistencePlan } from '../services/recordInput/snapshot/OutputPlanner';
export * from '../services/recordInput/RecordInputFacade';
export { RecordInputKernel } from '../services/recordInput/RecordInputKernel';
export { GoalTemplateResolver } from '../services/GoalTemplateResolver';
export type { GoalTemplateResolveInput, GoalTemplateResolveResult, GoalTemplateSourceType } from '../services/GoalTemplateResolver';
