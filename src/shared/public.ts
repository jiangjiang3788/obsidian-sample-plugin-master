// src/shared/public.ts
/**
 * Shared Public API（薄出口）
 *
 * 目的：
 * - app/features 等上层只能从这里拿 shared 能力，避免 @shared/** 深导入扩散
 * - 允许逐步迁移：先把出口做薄、稳定，再逐步收敛内部结构
 */

export * from './utils/errorHandler';
export * from './utils/performance';
export * from './utils/linkedTimeFields';
export * from './styles/mui-theme';
export * from './types/actions';
export * from './types/taskTime';
export * from './hooks';
export * from './hooks/useFormState';
export * from './patterns/ModalSavePattern';
export * from './ui/contracts';
export * from './ui/GroupedContainer';
export * from './ui/muiCompat';
export * from './ui/primitives/Modal';
export * from './ui/components/ModalHeader';
export * from './ui/components/FilterPopover';
export * from './ui/composites/SimpleSelect';
export * from './ui/composites/FormField';
export * from './ui/composites/FieldManager';
export * from './ui/composites/TagsRenderer';
export * from './ui/composites/TaskCheckbox';
export * from './ui/composites/TaskSendToTimerButton';
export * from './ui/composites/dialogs/NamePromptModal';
export * from './ui/composites/form/ListEditor';
export * from './ui/heatmap/HeatmapCell';
export * from './ui/items/BlockItem';
export * from './ui/items/FieldPill';
export * from './ui/items/ItemLink';
export * from './ui/items/TaskRow';
export * from './ui/modals/CheckinManagerModal';
export * from './ui/modals/EditTaskModal';
export * from './ui/timeline';
export * from './ui/views';
export * from './ui/views/ViewToolbar';
