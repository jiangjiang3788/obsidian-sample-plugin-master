// src/core/view/public.ts
/**
 * Core view-query and view-configuration public facade.
 */
export * from '../view-config/displayFields';
export * from '../view-config/domainFields';
export * from '../view-config/filterValueSemantics';
export * from '../config/views';
export { useTimelineZoom } from '../hooks/useTimelineZoom';

// R6: canonical Record selection engine exposed through the existing view-query facade.
export * from '../query/RecordQuery';
export * from '../query/ViewRecordQuery';
