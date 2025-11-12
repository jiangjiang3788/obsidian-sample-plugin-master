/**
 * 类型定义汇总导出
 */

// 主题相关类型
export type {
    ExtendedTheme,
    ThemeTreeNode,
    ThemeOverrideKey,
    BatchOperationType,
    ThemeContextMenuData
} from './theme.types';

// 组件属性类型
export type {
    InlineEditorProps,
    BatchOperationDialogProps,
    ThemeTreeNodeRowProps,
    ThemeMatrixProps,
    ThemeTableProps,
    ThemeToolbarProps,
    ModalData
} from './props.types';

// 批量操作类型
export type {
    BatchOperationType as EnhancedBatchOperationType,
    BatchOperationParams,
    BatchOperationResult,
    BatchOperationConfig
} from './batch.types';

export {
    BATCH_OPERATION_CONFIGS,
    getAvailableOperations,
    isThemeOperation,
    isBlockOperation
} from './batch.types';

// 选择状态类型
export type {
    SelectionMode,
    SelectionState,
    SelectionStats,
    SelectionAction,
    SelectionEvent
} from './selection.types';

export {
    createEmptySelectionState,
    getSelectionStats,
    clearSelectionByMode,
    clearAllSelections,
    createCellKey,
    parseCellKey,
    getTargetsFromSelection,
    isItemSelected,
    toggleItemSelection
} from './selection.types';
