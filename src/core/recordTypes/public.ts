export { RECORD_TYPE_IDS } from '@/core/records/schema';
export type { RecordCaptureMode } from '@/core/records/schema';
export type { RecordTypeDefinition, TemplateRecordTypeDefinition } from './types';
export {
  DEFAULT_RECORD_TYPES,
  DEFAULT_TEMPLATE_RECORD_TYPES,
  ENERGY_RECORD_TYPE,
  ENERGY_RECORD_TYPE_ID,
  buildRecordTypeInputSettings,
  getEffectiveRecordTypes,
  getRecordTypeById,
  getTemplateRecordTypeById,
  getTemplateRecordTypes,
  isDirectRecordType,
} from './registry';
export {
  RECORD_TYPE_PRESENTATION_ORDER,
  RECORD_TYPE_PRESENTATION_REGISTRY,
  compareRecordTypeKeys,
  getRecordTypePresentation,
  getRecordTypePresentationOrder,
  normalizeRecordTypePresentationKey,
  sortRecordTypesByPresentation,
} from './presentation';
export type { CanonicalRecordTypePresentationKey, RecordTypePresentation, UserVisibleRecordType } from './presentation';
export {
  DEFAULT_RECORD_TYPE_COLOR_HEX,
  buildRecordTypeColorCssVariables,
  normalizeRecordTypeColorHex,
  normalizeRecordTypeColorOverrides,
} from './color';
export type { RecordTypeColorOverrides } from './color';
