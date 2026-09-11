import type { InputSettings } from '@/core/recordInput/CaptureTemplate';
import {
  ENERGY_DEFINITION,
  RECORD_SCHEMA_DEFINITIONS,
  RECORD_TYPE_IDS,
} from '@/core/records/schema';
import type { RecordTypeDefinition, TemplateRecordTypeDefinition } from './types';
import { sortRecordTypesByPresentation } from './presentation';

export const ENERGY_RECORD_TYPE_ID = RECORD_TYPE_IDS.ENERGY;
export const ENERGY_RECORD_TYPE = ENERGY_DEFINITION;

/**
 * The one runtime registry for user-capturable RecordTypes.
 *
 * Adding a normal RecordType must happen in the record schema definitions only;
 * QuickInput, GoalTemplate, AI and view adapters consume this registry instead
 * of maintaining their own Block lists.
 */
export const DEFAULT_RECORD_TYPES: readonly RecordTypeDefinition[] = Object.freeze(
  sortRecordTypesByPresentation(
    RECORD_SCHEMA_DEFINITIONS.filter((definition) => definition.capabilities.userVisible && definition.captureMode !== 'internal'),
    (definition) => definition.coreBlock,
  ),
);

/** Template-driven RecordTypes. Direct/internal kinds are intentionally excluded. */
export const DEFAULT_TEMPLATE_RECORD_TYPES: readonly TemplateRecordTypeDefinition[] = Object.freeze(
  sortRecordTypesByPresentation(
    RECORD_SCHEMA_DEFINITIONS.filter((definition): definition is TemplateRecordTypeDefinition =>
      definition.capabilities.userVisible && definition.captureMode === 'template' && typeof definition.recordTypeId === 'string'
    ),
    (definition) => definition.coreBlock,
  ),
);

export function getEffectiveRecordTypes(): RecordTypeDefinition[] {
  return [...DEFAULT_RECORD_TYPES];
}

export function getTemplateRecordTypes(): TemplateRecordTypeDefinition[] {
  return [...DEFAULT_TEMPLATE_RECORD_TYPES];
}

export function getRecordTypeById(recordTypeId: string): RecordTypeDefinition | null {
  const id = String(recordTypeId || '').trim();
  return DEFAULT_RECORD_TYPES.find((item) => item.id === id) || null;
}

export function getTemplateRecordTypeById(recordTypeId: string): TemplateRecordTypeDefinition | null {
  const id = String(recordTypeId || '').trim();
  return DEFAULT_TEMPLATE_RECORD_TYPES.find((item) => item.id === id) || null;
}

/**
 * Thin adapter for older AI/view utilities that still accept InputSettings.
 * It is derived on demand and is never stored in ThinkSettings or data.json.
 */
export function buildRecordTypeInputSettings(): InputSettings {
  return { blocks: [...DEFAULT_TEMPLATE_RECORD_TYPES] };
}

export function isDirectRecordType(recordType: Pick<RecordTypeDefinition, 'captureMode'>): boolean {
  return recordType.captureMode === 'direct';
}
