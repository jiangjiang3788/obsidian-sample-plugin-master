/**
 * 组件属性类型定义
 */
import type { AppStore } from '@state/AppStore';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import type { ExtendedTheme, ThemeTreeNode, BatchOperationType } from './theme.types';
import type { ThemeMatrixMode, SelectionStats } from '../hooks/useThemeMatrixSelection';

/**
 * InlineEditor 组件属性
 */
export interface InlineEditorProps {
    /** 当前值 */
    value: string;
    /** 保存回调 */
    onSave: (newValue: string) => void;
}

/**
 * BatchOperationDialog 组件属性
 */
export interface BatchOperationDialogProps {
    /** 是否打开 */
    open: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 选中的主题数量 */
    selectedCount: number;
    /** 确认操作回调 */
    onConfirm: (operation: BatchOperationType) => void;
}

/**
 * ThemeTreeNodeRow 组件属性 (简化版)
 */
export interface ThemeTreeNodeRowProps {
    /** 树节点数据 */
    node: ThemeTreeNode;
    /** Block模板列表 */
    blocks: BlockTemplate[];
    /** 覆盖配置映射 */
    overridesMap: Map<string, ThemeOverride>;
    /** 单元格点击处理 */
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    /** 正在编辑的主题ID */
    editingThemeId: string | null;
    /** 设置编辑主题ID */
    onSetEditingThemeId: (id: string | null) => void;
    /** 应用状态存储 */
    appStore: AppStore;
    /** 切换展开状态 */
    onToggleExpand: (themeId: string) => void;
    /** 右键菜单处理 */
    onContextMenu: (event: MouseEvent, theme: ExtendedTheme) => void;
    /** 选择检查函数 */
    isThemeSelected: (themeId: string) => boolean;
    isPartiallySelected: (themeId: string) => boolean;
    /** 选择操作回调 */
    onThemeSelect: (themeId: string, includeChildren: boolean, event?: any) => void;
}

/**
 * ThemeMatrix 主组件属性
 */
export interface ThemeMatrixProps {
    /** 应用状态存储 */
    appStore: AppStore;
}

/**
 * ThemeTable 组件属性 (简化版)
 */
export interface ThemeTableProps {
    /** Block模板列表 */
    blocks: BlockTemplate[];
    /** 激活的主题节点 */
    activeThemes: ThemeTreeNode[];
    /** 归档的主题节点 */
    archivedThemes: ThemeTreeNode[];
    /** 是否显示归档主题 */
    showArchived: boolean;
    /** 覆盖配置映射 */
    overridesMap: Map<string, ThemeOverride>;
    /** 选择状态 */
    selection: import('../hooks/useThemeMatrixSelection').ThemeMatrixSelection;
    /** 正在编辑的主题ID */
    editingThemeId: string | null;
    /** 应用状态存储 */
    appStore: AppStore;
    /** 事件处理器 */
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleExpand: (themeId: string) => void;
    onContextMenu: (event: MouseEvent, theme: ExtendedTheme) => void;
    onSetEditingThemeId: (id: string | null) => void;
    /** 选择检查函数 */
    isThemeSelected: (themeId: string) => boolean;
    isBlockSelected: (blockId: string) => boolean;
    /** 选择操作回调 */
    onThemeSelect: (themeId: string, includeChildren: boolean, event?: any) => void;
    onBlockSelect: (blockId: string, event?: any) => void;
}

/**
 * ThemeToolbar 组件属性
 */
export interface ThemeToolbarProps {
    /** 当前选择模式 */
    mode: ThemeMatrixMode;
    /** 模式切换回调 */
    onModeChange: (mode: ThemeMatrixMode) => void;
    /** 选择统计信息 */
    selectionStats: SelectionStats;
    /** 是否显示归档主题 */
    showArchived: boolean;
    /** 全选处理 */
    onSelectAll: () => void;
    /** 清除选择处理 */
    onClearSelection: () => void;
    /** 批量操作处理 */
    onBatchOperation: () => void;
    /** 切换显示归档 */
    onToggleArchived: (show: boolean) => void;
}

/**
 * Modal 数据类型
 */
export interface ModalData {
    /** Block模板 */
    block: BlockTemplate;
    /** 主题定义 */
    theme: ThemeDefinition;
    /** 覆盖配置 */
    override: ThemeOverride | null;
}
