import type {
  FieldCardinality,
  FieldCategory,
  FieldInputType,
  FieldOption,
  FieldSemantic,
  FieldSource,
  FieldStoragePolicy,
  FieldValueType,
} from './FieldTypes';

/**
 * Canonical runtime field schema.
 *
 * RecordSchemaDefinition decides which business facts exist for a Record kind.
 * RecordCaptureTemplate decides which fields a user wants to capture and in what order.
 * FieldSchema is the single runtime description used by input, persistence mapping,
 * display/edit policy, filters and AI snapshots.
 */
export interface FieldSchema {
  key: string;
  label: string;
  valueType: FieldValueType;
  inputType?: FieldInputType;
  semantic?: FieldSemantic;
  category: FieldCategory;
  source: FieldSource;
  cardinality?: FieldCardinality;
  hierarchical?: boolean;
  options?: FieldOption[];
  aliases?: string[];
  storage?: FieldStoragePolicy;
  description?: string;
  deprecated?: boolean;
  hiddenByDefault?: boolean;
  required?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  formatter?: (value: unknown, item?: unknown) => string;
}

/**
 * Persisted user/template configuration DTO.
 * `type` is retained in settings for compatibility and represents input capability,
 * not storage grammar. Runtime code must resolve this DTO into FieldSchema first.
 */
export interface CaptureFieldConfig {
  id: string;
  key: string;
  label: string;
  type: FieldInputType;
  semanticType?: 'path' | 'ratingPair' | FieldSemantic | string;
  semantic?: FieldSemantic | string;
  cardinality?: FieldCardinality;
  hierarchical?: boolean;
  storage?: FieldStoragePolicy;
  aliases?: string[];
  auxKey?: string;
  defaultValue?: string;
  /** Keep optional select fields empty instead of implicitly choosing the first option. */
  autoSelectFirst?: boolean;
  required?: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
}

export function fieldValueTypeForInputType(inputType: FieldInputType | undefined): FieldValueType {
  switch (inputType) {
    case 'number':
    case 'rating': return 'number';
    case 'boolean': return 'boolean';
    case 'date': return 'date';
    case 'datetime': return 'datetime';
    case 'time': return 'time';
    case 'multiSelect':
    case 'multiPath':
    case 'multiTag': return 'tags';
    case 'path':
    case 'hierarchicalSingleSelect': return 'path';
    case 'image':
    case 'multiImage': return 'image';
    case 'file': return 'file';
    default: return 'string';
  }
}
