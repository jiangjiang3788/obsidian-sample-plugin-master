import type { PeriodPolicy } from '@/core/period/PeriodPolicy';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
export const RECORD_SCHEMA_CONTRACT_VERSION = 1;

export type RecordCoreBlock =
  | 'thought'
  | 'evidence'
  | 'habit'
  | 'plan'
  | 'review'
  | 'blocker'
  | 'milestone'
  | 'task'
  | 'task-series'
  | 'task-session'
  | 'energy';

export type RecordFamily = 'generic' | 'task-domain' | 'internal-history' | 'energy-domain';

export type RecordFieldRole =
  | 'identity'
  | 'canonical-reference'
  | 'human-snapshot'
  | 'business-fact'
  | 'business-history'
  | 'display-snapshot'
  | 'domain-fact'
  | 'measurement-provenance'
  | 'derived'
  | 'debug';

/**
 * target: belongs to the final persisted Record shape.
 * omit-default: belongs to the final shape but the codec may omit its default value.
 * derived: must be reconstructed at runtime and should not be persisted by new writers.
 * debug: runtime/source diagnostics only; never a normal Vault business field.
 */
export type RecordFieldPersistence = 'target' | 'omit-default' | 'derived' | 'debug';

export type RecordFieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'record-id'
  | 'goal-id'
  | 'tags'
  | 'enum';

export interface RecordFieldContract {
  /** Canonical persisted Markdown key, e.g. 目标ID / 记录子类型. */
  key: string;
  aliases?: readonly string[];
  role: RecordFieldRole;
  persistence: RecordFieldPersistence;
  valueType: RecordFieldValueType;
  required?: boolean;
  allowedValues?: readonly string[];
  defaultValue?: string | number | boolean;
  /** Transitional/alias field converges to this canonical key. */
  targetKey?: string;
  description: string;
}

export interface RecordSchemaCapabilities {
  userVisible: boolean;
  goalBindable: boolean;
  themeAware: boolean;
  dated: boolean;
  subtypeAware?: boolean;
  periodAware?: boolean;
  statusful?: boolean;
  executionHistory?: boolean;
  /** User templates may persist additional safe KV fields beyond the core contract. */
  customFields?: boolean;
}

export interface RecordSchemaContract {
  contractVersion: number;
  coreBlock: RecordCoreBlock;
  displayName: string;
  family: RecordFamily;
  capabilities: RecordSchemaCapabilities;
  /** Persisted-field contract; distinct from capture form fields. */
  recordFields: readonly RecordFieldContract[];
}

export type RecordCaptureMode = 'template' | 'direct' | 'internal';

/**
 * Authoritative definition for a Record kind.
 *
 * It owns both the persisted schema contract and the default capture surface.
 * Goal templates/settings may override capture defaults, but may not redefine
 * Record identity, capabilities, or persisted field semantics.
 */
export interface RecordSchemaDefinition extends RecordSchemaContract {
  /** Stable type/capture id (for example core.task / core.energy). */
  id: string;
  /** Runtime key; equal to coreBlock for the canonical definition. */
  key: RecordCoreBlock;
  name: string;
  categoryKey: string;
  captureMode: RecordCaptureMode;
  /** Stable template-type binding. Direct/internal records leave this undefined. */
  coreBlockId?: string;
  /** Default capture fields. These are UI/input fields, not persisted schema fields. */
  fields: TemplateField[];
  targetFile: string;
  appendUnderHeader?: string;
  periodPolicy?: PeriodPolicy;
  system: true;
  version: number;
  description?: string;
}


export type RecordSchemaIssueCode =
  | 'unknown_field'
  | 'missing_required_field'
  | 'derived_field_persisted'
  | 'debug_field_persisted'
  | 'invalid_enum_value';

export interface RecordSchemaIssue {
  code: RecordSchemaIssueCode;
  coreBlock: string;
  field: string;
  value?: unknown;
  message: string;
}
