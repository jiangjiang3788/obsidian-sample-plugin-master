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
