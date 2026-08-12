import { RECORD_SCHEMA_DEFINITIONS, RECORD_TYPE_IDS } from '@/core/records/schema';
import type { CoreBlockDefinition, CoreBlockKey, CoreBlockSettings } from './types';

export const CORE_BLOCK_IDS: Record<Uppercase<CoreBlockKey>, string> = {
  TASK: RECORD_TYPE_IDS.TASK,
  PLAN: RECORD_TYPE_IDS.PLAN,
  REVIEW: RECORD_TYPE_IDS.REVIEW,
  THOUGHT: RECORD_TYPE_IDS.THOUGHT,
  HABIT: RECORD_TYPE_IDS.HABIT,
  EVIDENCE: RECORD_TYPE_IDS.EVIDENCE,
  BLOCKER: RECORD_TYPE_IDS.BLOCKER,
  MILESTONE: RECORD_TYPE_IDS.MILESTONE,
};

/**
 * Derived template-capture catalog. The authoritative type/schema metadata lives
 * in RECORD_SCHEMA_DEFINITIONS; this list exists only for legacy settings/UI APIs.
 */
export const DEFAULT_CORE_BLOCKS: CoreBlockDefinition[] = RECORD_SCHEMA_DEFINITIONS
  .filter((definition) => definition.captureMode === 'template') as CoreBlockDefinition[];

export const DEFAULT_CORE_BLOCK_SETTINGS: CoreBlockSettings = {
  enabledCoreBlockIds: DEFAULT_CORE_BLOCKS.map((block) => block.id),
  patches: [],
};
