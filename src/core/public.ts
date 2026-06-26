// src/core/public.ts
/**
 * Core Public API (Phase 4.4)
 * ===============================================================
 *
 * ✅ 这是 core 层对外的【唯一门面】。
 * app / features / shared 访问 core，只能 import 这个文件。
 *
 * 你要的“结构性不可绕过事实”靠三件事一起成立：
 * 1) arch-gate（CI 硬闸）解析 import 落点：越界直接 fail
 * 2) eslint（开发期软闸）快速提示：减少无意越界
 * 3) public 门面（代码形状）收敛出口：实现默认不可见
 *
 * 约束（防止 core/public.ts 变垃圾桶）：
 * - ✅ 允许 export：领域 types、纯 utils、稳定 config、必要的 DI tokens/服务类（用于组合根/UseCase）
 * - ❌ 禁止 export：临时性的 UI helper、feature 业务规则、一次性脚本、内部实现细节（优先留在内部文件）
 * - ❌ 禁止把 “export-star from 某个深层实现文件” 当捷径（除非它本身就是模块级 public barrel）
 *
 * 命名约定：
 * - ThemeMatrix 模块的 buildThemeTree / ThemeTreeNode 对外统一前缀：
 *   buildThemeMatrixTree / ThemeMatrixTreeNode，避免与主题路径树 API 冲突。
 */

//
// -------------------- Domain Types (唯一真源) --------------------
//
export * from './types';
export type {
    GoalId,
    CycleId,
    PlanId,
    TaskId,
    RecordId,
    ReviewId,
    GoalStatus,
    CycleStatus,
    CycleGranularity,
    GoalMetricDirection,
    GoalMetricContract,
    GoalDefinition,
    CycleDefinition,
    GoalRecordRelationType,
    GoalRecordRelation,
    PlanTaskRelation,
    GoalReviewSnapshot,
    GoalRelationHint,
    GoalSettings,
} from './goal';
export { DEFAULT_GOAL_SETTINGS, normalizeGoalPath, splitGoalPath, buildGoalOverviewModel, makeStableGoalIdFromPath, resolveDerivedPeriod, normalizePeriodGranularity, isPeriodAwareCoreBlock, normalizePeriodPolicyGranularity, resolveTemplatePeriodPolicy, DEFAULT_TEMPLATE_VARIANT_ID, SYSTEM_RECORD_CONTEXT_FIELD_KEYS, isSystemRecordContextField, normalizeTemplateVariantId, isDefaultTemplateVariant, getGoalTemplates, getGoalTemplateId, getGoalTemplateCandidateGoalIds, getGoalTemplateVariants, findGoalTemplate, fromLegacyGoalTemplateStorage, toLegacyGoalTemplateStorage, upsertGoalTemplateInSettings, removeGoalTemplateFromSettings, removeGoalTemplatesForGoal, cleanupGoalTemplateStorage, getGoalTemplateDisplayInfo, getGoalTemplateDisplayName, isGeneratedGoalTemplateName, readGoalTemplateIcon, readGoalTemplateThemePath, goalTemplateHasCustomOverrides, inferGoalTemplateEditMode, compactGoalTemplateForStorage, describeGoalTemplateStorageDiff, UNASSIGNED_GOAL_KEY, getItemGoalKey, getItemGoalLabel, getItemThemeKey, getItemThemeLabel, buildGoalThemeBreakdown, buildGoalBuckets } from './goal';
export type { GoalPathParts, GoalOverviewModel, GoalOverviewRow, GoalOverviewMetricProgress, GoalOverviewCycleSummary, DerivedPeriod, TemplateVariantId, TemplateVariantIdentity, GoalTemplate, PeriodGranularity, PeriodPolicy, GoalBucket, GoalThemeBreakdownRow, CompactGoalTemplateOptions, GoalTemplateDisplayInfo, GoalTemplateEditMode } from './goal';

export { ThemeMetadataResolver } from './themeMetadata';
export type { ThemeMetadata } from './themeMetadata';

//
// -------------------- Utils（可复用纯能力） --------------------
//
export * from './utils';
export { buildRecordSubmitFeedbackPresentation } from './utils/recordSubmitFeedback';
export {
    buildRecordSubmitRecoveryPresentation,
    getRecordRecoveryPaths,
} from './utils/recordSubmitRecovery';
export type {
    BuildRecordSubmitRecoveryPresentationOptions,
    RecordSubmitRecoveryPresentation,
} from './utils/recordSubmitRecovery';
export {
    addDisplayField,
    moveDisplayField,
    normalizeDisplayFields,
    removeDisplayField,
    replaceDisplayField,
} from './view-config/displayFields';
export type { NormalizeDisplayFieldsOptions } from './view-config/displayFields';
export {
    VIEW_PRIMARY_FIELD_KEYS,
    VIEW_LEGACY_FIELD_ALIASES,
    VIEW_NOISY_DISPLAY_FIELDS,
    isNoisyViewDisplayField,
    isPeriodViewField,
    isTemplateSourceViewField,
    normalizeViewFieldKey,
    normalizeViewFilters,
    normalizeViewGroupFields,
    normalizeViewConfigDomain,
    normalizeViewInstanceDomain,
    normalizeViewSort,
} from './view-config/domainFields';
export {
    FIELD_CATEGORY_LABELS,
    FIELD_REGISTRY,
    getAvailableFields,
    getAvailableFieldsByCategory,
    getCanonicalFieldKey,
    getBuiltInFieldGuideGroups,
    getCoreInputFieldPresets,
    getCoreInputFieldTarget,
    getCustomFieldNameWarning,
    getFieldCategory,
    getFieldCategoryLabel,
    getFieldDefinition,
    getFieldLabel,
    getFieldPickerOptions,
    getReservedCustomFieldNames,
    isCoreInputFieldName,
    isReservedCustomFieldName,
    makeSafeCustomFieldName,
    getFieldOptionLabel,
    getTemplateFieldInputType,
    getTemplateFieldSemantic,
    isImageFieldDefinition,
    isTemplateImageField,
    isTemplateMultiValueField,
    isTemplatePathField,
    isTemplateTagField,
    normalizeFieldKey,
    normalizeImageValue,
    normalizeTemplateFieldValue,
    normalizeTemplateRenderData,
    createCustomTemplateField,
    getUserTemplateFieldTypeOptions,
    isMultiValueTemplateFieldType,
    normalizeTemplateFieldType,
    sanitizeTemplateField,
    sanitizeTemplateFields,
    templateFieldTypeSupportsDefaultValue,
    templateFieldTypeUsesOptions,
    parseTagList,
    scanFieldMigrations,
    previewFieldMigrations,
    hasFieldMigrationIssues,
    filterActionableFieldMigrationIssues,
    runFieldSystemHealthChecks,
    assertFieldSystemHealthy,
    readFieldValue,
    resolveFieldValue,
    splitHierarchyPath,
    canInlineEditField,
    getFieldEditPolicy,
    getFieldEditorKind,
    normalizeEditableFieldKey,
    CONTENT_FIELD_KEY,
    FULL_DATA_FIELD_KEY,
} from './fields';
export type {
    BuiltInFieldGuideGroup,
    BuiltInFieldGuideItem,
    CoreInputFieldPreset,
    FieldCategory,
    FieldDefinition,
    FieldInputType,
    FieldPickerOption,
    FieldSemantic,
    FieldValueResolution,
    FieldValueSource,
    FieldMigrationAction,
    FieldMigrationIssue,
    FieldMigrationIssueKind,
    FieldMigrationPreview,
    FieldMigrationScanInput,
    FieldMigrationScanOptions,
    FieldMigrationSeverity,
    FieldSystemCheckResult,
    FieldSystemCheckStatus,
    FieldSystemHealthReport,
    ImageFieldValue,
    FieldCommitMode,
    FieldEditDangerLevel,
    FieldEditPolicy,
    FieldEditValueSource,
    FieldEditorKind,
} from './fields';

//
// -------------------- AI Module（模块级 public） --------------------
// 注意：AI 子模块本身已经有 index.ts 作为 public barrel
//
export * from './ai';

//
// -------------------- ThemeMatrix（避免命名冲突，统一前缀） --------------------
//
export { ThemeMatrixService } from './theme-matrix/ThemeMatrixService';
export type {
    ThemeMatrixServiceConfig,
    AddThemeValidation,
    UpdateThemeValidation,
    DeleteThemeComputation,
} from './theme-matrix/ThemeMatrixService';

export { ThemeScanService } from './theme-matrix/ThemeScanService';
export type {
    ScanConfig,
    ScanResult,
    ScanStats,
    ImportPreview,
    ThemeScanServiceConfig,
} from './theme-matrix/ThemeScanService';

export { buildThemeTree as buildThemeMatrixTree } from './theme-matrix/themeTreeBuilder';
export type { ThemeTreeNode as ThemeMatrixTreeNode, ExtendedTheme, ThemeOverrideKey } from './theme-matrix/theme.types';

// -------------------- Theme Tree (Unified) --------------------
// 说明：这是“主题路径树/选择器”用的统一实现（core/theme）。
// 为避免与 ThemeMatrix 的同名符号冲突，对外统一使用 ThemePathTree* 前缀。
export {
    ThemeTreeBuilder as ThemePathTreeBuilder,
    buildThemeTree as buildThemePathTree,
    flattenThemeTree as flattenThemePathTree,
    searchThemeTree as searchThemePathTree,
} from './theme/ThemeTreeBuilder';
export type {
    ThemeTreeNode as ThemePathTreeNode,
    FlatThemeTreeNode as ThemePathTreeFlatNode,
} from './theme/ThemeTreeBuilder';

export { parsePath, getRelativePath } from './theme-matrix/themePathParser';

//

// -------------------- Records（记录标准化/Codec） --------------------
export { normalizeRecordItem, normalizeRecordItems } from './records';
export type {
    RecordEntity,
    RecordFileContext,
    RecordLocationContext,
    RecordNormalizeContext,
} from './records';

// -------------------- Progression（目标/成长反馈纯计算） --------------------
export { computeProgression } from './progression/computeProgression';
export type { ProgressComputationOptions } from './progression/computeProgression';
export type { ProgressBreakdownRow, ProgressResult } from './progression/types';

// -------------------- Core Blocks（目标中心内置 Block） --------------------
export {
    CORE_BLOCK_IDS,
    DEFAULT_CORE_BLOCKS,
    DEFAULT_CORE_BLOCK_SETTINGS,
    buildLegacyCoreBlockMap,
    inferCoreBlockIdFromLegacyBlock,
    getCoreBlockById,
    getEffectiveCoreBlocks,
    normalizeCoreBlockSettings,
} from './blocks';
export type {
    CoreBlockKey,
    CoreBlockDefinition,
    CoreBlockPatch,
    CoreBlockSettings,
} from './blocks';


// -------------------- Core Services（DI 需要的 token / class） --------------------
// 说明：这些 export 是为了组合根（main/app）和 usecases 能 resolve。
//
export { DataStore } from './services/DataStore';
export { InputService } from './services/InputService';
export { ItemService } from './services/ItemService';
export { ActionService } from './services/ActionService';
export { TimerStateService } from './services/TimerStateService';

export { VaultFileStorage, STORAGE_TOKEN } from './services/StorageService';
export type { IPluginStorage } from './services/StorageService';


// -------------------- Record Input internals promoted for app usecase boundary --------------------
// 说明：app/usecases/recordInput.usecase.ts 只能通过 core/public.ts 访问 core。
// 这里导出的是 usecase 编排所需的稳定核心构件，不允许 features/shared 直接依赖内部路径。
export { GoalTemplateResolver } from './services/GoalTemplateResolver';
export type { GoalTemplateResolveInput, GoalTemplateResolveResult, GoalTemplateSourceType } from './services/GoalTemplateResolver';
export { RecordInputKernel } from './services/recordInput/RecordInputKernel';
export { buildRecordOutputPlan, buildRecordPersistencePlan } from './services/recordInput/snapshot/OutputPlanner';
export {
    buildCancelledResult,
    buildConflictResult,
    buildErrorResult,
    buildSuccessResult,
    buildValidationErrorResult,
} from './services/recordInput/submitResult';
export { applyRecordRefreshPlan, finalizeRecordSubmitResult } from './services/recordInput/refreshCoordinator';
export { isRecordConflictError } from './services/recordInput/mutationErrors';

// -------------------- Core Ports（Phase2: platform 边界） --------------------
// 说明：core 层只定义接口（Port）；平台层实现并在组合根注册。
export { VAULT_PORT_TOKEN } from './ports/VaultPort';
export type { VaultPort } from './ports/VaultPort';

export { UI_PORT_TOKEN } from './ports/UiPort';
export type { UiPort } from './ports/UiPort';

export { METADATA_PORT_TOKEN } from './ports/MetadataPort';
export type { MetadataPort, HeadingInfo } from './ports/MetadataPort';

export { FILESTAT_PORT_TOKEN } from './ports/FileStatPort';
export type { FileStatPort, FileStat } from './ports/FileStatPort';

export { EVENTS_PORT_TOKEN } from './ports/EventsPort';
export type { EventsPort, UnsubscribeFn } from './ports/EventsPort';

export type { AppPort, AppVaultNamePort } from './ports/AppPort';
export { MODAL_PORT_TOKEN } from './ports/ModalPort';
export { MESSAGE_RENDER_PORT_TOKEN } from './ports/MessageRenderPort';
export type { MessageRenderPort, RenderMessageArgs, MessageContentType } from './ports/MessageRenderPort';
export type { ModalPort, NamePromptOptions, CheckinManagerOpenArgs } from './ports/ModalPort';


export { SettingsRepository, SETTINGS_PERSISTENCE_TOKEN } from './services/SettingsRepository';
export type { ISettingsPersistence } from './services/SettingsRepository';

export { RepositorySettingsProvider } from './services/RepositorySettingsProvider';

// services/types.ts 中包含 DI tokens + 少量 interface。
// 对外可见面统一从 core/types barrel 暴露（避免 core/public.ts 深层 export*）

//
// -------------------- Bootstrap / Polyfills --------------------
//
export { ensureReflectMetadata } from './polyfills';
export { setupCoreContainer } from './di/setupCore';

//
// -------------------- Hooks（暂时放 core，后续可迁移到 shared/ui） --------------------
//
export { useTimelineZoom } from './hooks/useTimelineZoom';
export { PROGRESS_VIEW_DEFAULT_CONFIG, TASK_EXECUTION_VIEW_DEFAULT_CONFIG } from './config/viewConfigs';
