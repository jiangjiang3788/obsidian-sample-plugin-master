// src/shared/public.ts
/**
 * Shared Public API（薄出口）
 *
 * 目的：
 * - app/features 等上层只能从这里拿 shared 能力，避免 @shared/** 深导入扩散
 * - 允许逐步迁移：先把出口做薄、稳定，再逐步收敛内部结构
 */

export * from './utils/error';
export * from './utils/devConsole';
export * from './utils/diagnosticConsole';
export * from './utils/performance';
export * from './utils/linkedTimeFields';
export * from './utils/takeLatest';
export * from './utils/deviceProfile';
export * from './styles/mui-theme';
export * from './types/actions';
export * from './types/taskTime';
export * from './hooks/public';
export * from './debug/inputDiagnostics';
export * from './patterns/ModalSavePattern';
export * from './ui/public';
// ui/components 已统一出口（ThemeTreeNodeLabel 等）
export * from './components/public';
