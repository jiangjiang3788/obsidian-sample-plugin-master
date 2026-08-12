import type { FieldOption } from '@/core/fields/FieldTypes';
import type { CaptureFieldConfig } from '@/core/fields/FieldSchema';
import type { PeriodPolicy } from '@/core/period/PeriodPolicy';
import type { ThemeDefinition } from '@/core/theme/ThemeDefinition';

export type TemplateFieldOption = FieldOption;
export type TemplateField = CaptureFieldConfig;

/**
 * User-owned capture template.
 *
 * The template decides which fields the user records, their order/defaults and
 * destination. Markdown grammar remains owned by the Record codec.
 */
export interface RecordCaptureTemplate {
  id: string;
  name: string;
  categoryKey: string;
  fields: TemplateField[];
  targetFile: string;
  coreBlockId?: string;
  periodPolicy?: PeriodPolicy;
  appendUnderHeader?: string;
  /**
   * Legacy read-only metadata for pre-R10 templates. The canonical Record codec owns
   * Markdown grammar; submit/output code must ignore this field.
   */
  readonly outputTemplate?: string;
}

export interface InputSettings {
  blocks: RecordCaptureTemplate[];
  themes: ThemeDefinition[];
  categories?: string[];
}
