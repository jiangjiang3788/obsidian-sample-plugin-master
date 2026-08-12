import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { getEffectiveCoreBlocks } from '@/core/blocks';
import {
  ENERGY_DEFINITION,
  RECORD_SCHEMA_DEFINITIONS,
  RECORD_TYPE_IDS,
  type RecordSchemaDefinition,
} from '@/core/records/schema';

export const ENERGY_RECORD_TYPE_ID = RECORD_TYPE_IDS.ENERGY;
export const ENERGY_RECORD_TYPE = ENERGY_DEFINITION;

/** User-capturable default record types; internal history definitions stay hidden. */
export const DEFAULT_RECORD_TYPES: RecordSchemaDefinition[] = RECORD_SCHEMA_DEFINITIONS
  .filter((definition) => definition.captureMode !== 'internal') as RecordSchemaDefinition[];

/** Template types respect settings patches; direct types come from the canonical schema definition. */
export function getEffectiveRecordTypes(
  settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>,
): RecordSchemaDefinition[] {
  return [...getEffectiveCoreBlocks(settings), ENERGY_DEFINITION];
}

export function getRecordTypeById(
  settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>,
  recordTypeId: string,
): RecordSchemaDefinition | null {
  return getEffectiveRecordTypes(settings).find((item) => item.id === recordTypeId) || null;
}

export function isDirectRecordType(recordType: Pick<RecordSchemaDefinition, 'captureMode'>): boolean {
  return recordType.captureMode === 'direct';
}
