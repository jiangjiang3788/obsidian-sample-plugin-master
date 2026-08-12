// src/core/types/fields.ts
/**
 * 兼容门面：历史代码从 core/types/fields 读取字段能力。
 * 新实现已经迁移到 core/fields/*，这里仅 re-export，避免多套字段注册表继续分裂。
 */
export type { FieldDefinition } from '@/core/fields/FieldDefinition';
export type { FieldSchema, CaptureFieldConfig } from '@/core/fields/FieldSchema';
export type { FieldPickerOption } from '@/core/fields/FieldRegistry';
export type {
  FieldCardinality,
  FieldCategory,
  FieldInputType,
  FieldOption,
  FieldSemantic,
  FieldSource,
  FieldStoragePolicy,
  FieldValueType,
} from '@/core/fields/FieldTypes';
export {
  getBuiltInFieldGuideGroups,
  getCoreInputFieldPresets,
  getCoreInputFieldTarget,
  getCustomFieldNameWarning,
  getReservedCustomFieldNames,
  isCoreInputFieldName,
  isReservedCustomFieldName,
  makeSafeCustomFieldName,
} from '@/core/fields/CoreFieldCatalog';
export type {
  BuiltInFieldGuideGroup,
  BuiltInFieldGuideItem,
  CoreInputFieldPreset,
} from '@/core/fields/CoreFieldCatalog';

export {
  FIELD_CATEGORY_LABELS,
  FIELD_REGISTRY,
  getAvailableFields,
  getAvailableFieldsByCategory,
  getCanonicalFieldKey,
  getFieldCategory,
  getFieldCategoryLabel,
  getFieldPickerOptions,
  getFieldDefinition,
  getFieldLabel,
  getFieldOptionLabel,
  isVisibleExtraField,
} from '@/core/fields/FieldRegistry';
export {
  HIDDEN_EXTRA_ALIAS_KEYS,
} from '@/core/fields/FieldRegistry';
export {
  getTemplateFieldInputType,
  getTemplateFieldSemantic,
  isTemplateImageField,
  isTemplateMultiValueField,
  isTemplatePathField,
  isTemplateTagField,
  normalizeTemplateFieldValue,
  normalizeTemplateRenderData,
  templateFieldMatches,
} from '@/core/fields/TemplateFieldAdapter';


export {
  createCustomTemplateField,
  getUserTemplateFieldTypeOptions,
  isMultiValueTemplateFieldType,
  normalizeTemplateFieldType,
  sanitizeTemplateField,
  sanitizeTemplateFields,
  templateFieldTypeSupportsDefaultValue,
  templateFieldTypeUsesOptions,
} from '@/core/fields/TemplateFieldSanitizer';

export { resolveCaptureFieldSchema, getCaptureFieldMarkdownKey } from '@/core/fields/CaptureFieldResolver';
