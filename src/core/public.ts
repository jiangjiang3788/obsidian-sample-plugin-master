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
 * - ❌ 禁止把 “export * from './某个深层实现文件'” 当捷径（除非它本身就是模块级 public barrel）
 *
 * 命名约定：
 * - ThemeMatrix 模块的 buildThemeTree / ThemeTreeNode 与 legacy themeUtils 冲突，
 *   对外统一前缀：buildThemeMatrixTree / ThemeMatrixTreeNode。
 */

//
// -------------------- Domain Types (唯一真源) --------------------
//
export * from './types';

//
// -------------------- Config（稳定常量） --------------------
//
export * from './config/viewConfigs';
export * from './config/heatmapViewConfig';

//
// -------------------- Utils（可复用纯能力） --------------------
//
export * from './utils';

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
// 为避免与 legacy utils/themeUtils / ThemeMatrix 的同名符号冲突，
// 对外统一使用 ThemePathTree* 前缀。
export {
    ThemeTreeBuilder as ThemePathTreeBuilder,
    buildThemeTree as buildThemePathTree,
    searchThemeTree as searchThemePathTree,
} from './theme/ThemeTreeBuilder';
export type { ThemeTreeNode as ThemePathTreeNode } from './theme/ThemeTreeBuilder';

//
// -------------------- Core Services（DI 需要的 token / class） --------------------
// 说明：这些 export 是为了组合根（main/app）和 usecases 能 resolve。
//
export { DataStore } from './services/DataStore';
export { InputService } from './services/InputService';
export { ItemService } from './services/ItemService';
export { ActionService } from './services/ActionService';
export { TimerStateService } from './services/TimerStateService';
export { VaultWatcher } from './services/VaultWatcher';

export { VaultFileStorage, STORAGE_TOKEN } from './services/StorageService';
export type { IPluginStorage } from './services/StorageService';

export { SettingsRepository, SETTINGS_PERSISTENCE_TOKEN } from './services/SettingsRepository';
export type { ISettingsPersistence } from './services/SettingsRepository';

export { RepositorySettingsProvider } from './services/RepositorySettingsProvider';

export * from './services/types';

//
// -------------------- Bootstrap / Polyfills --------------------
//
export { ensureReflectMetadata } from './polyfills';
export { setupCoreContainer } from './di/setupCore';

//
// -------------------- Hooks（暂时放 core，后续可迁移到 shared/ui） --------------------
//
export { useTimelineZoom } from './hooks/useTimelineZoom';
