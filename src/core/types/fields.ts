// src/core/types/fields.ts
/**
 * 兼容门面：历史代码从 core/types/fields 读取字段能力。
 * 新实现已经迁移到 core/fields/*，这里仅 re-export，避免多套字段注册表继续分裂。
 */
export type { FieldDefinition } from '@/core/fields/FieldDefinition';
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
  LEGACY_EXTRA_ALIAS_KEYS,
} from '@/core/fields/FieldLegacy';
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
  scanFieldMigrations,
  previewFieldMigrations,
  hasFieldMigrationIssues,
  filterActionableFieldMigrationIssues,
} from '@/core/fields/FieldMigration';
export type {
  FieldMigrationAction,
  FieldMigrationIssue,
  FieldMigrationIssueKind,
  FieldMigrationPreview,
  FieldMigrationScanInput,
  FieldMigrationScanOptions,
  FieldMigrationSeverity,
} from '@/core/fields/FieldMigration';
export {
  LEGACY_THEME_FIELD_KEYS,
  LEGACY_IMAGE_FIELD_KEYS,
  LEGACY_CATEGORY_FIELD_KEYS,
  LEGACY_TAG_FIELD_KEYS,
  isLegacyExtraAliasKey,
  isLegacyThemeFieldKey,
  isLegacyImageFieldKey,
  isLegacyCategoryFieldKey,
  isLegacyTagFieldKey,
  isLegacyCoreFieldAlias,
  getLegacyAliasTargetField,
} from '@/core/fields/LegacyFieldPolicy';

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
