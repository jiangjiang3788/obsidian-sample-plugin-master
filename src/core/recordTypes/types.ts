import type { RecordSchemaDefinition } from '@/core/records/schema';

/** Public domain name for a registered Record kind. */
export type RecordTypeDefinition = RecordSchemaDefinition;

/** A RecordType that uses the standard template-driven capture flow. */
export type TemplateRecordTypeDefinition = RecordSchemaDefinition & {
  captureMode: 'template';
  recordTypeId: string;
};
