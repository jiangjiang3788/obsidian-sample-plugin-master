/**
 * 组件属性类型定义
 */
import type { AppStore } from '@state/AppStore';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import type { ExtendedTheme, ThemeTreeNode, BatchOperationType } from './theme.types';

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
 * ThemeTreeNodeRow 组件属性
 */
export interface ThemeTreeNodeRowProps {
    /** 树节点数据 */
    node: ThemeTreeNode;
    /** Block模板列表 */
    blocks: BlockTemplate[];
    /** 覆盖配置映射 */
    overridesMap: Map<string, ThemeOverride>;
    /** 单元格点击处理 */
    handleCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    /** 正在编辑的主题ID */
    editingThemeId: string | null;
    /** 设置编辑主题ID */
    setEditingThemeId: (id: string | null) => void;
    /** 应用状态存储 */
    appStore: AppStore;
    /** 选中的主题集合 */
    selectedThemes: Set<string>;
    /** 切换选择状态 */
    onToggleSelect: (themeId: string, includeChildren: boolean) => void;
    /** 切换展开状态 */
    onToggleExpand: (themeId: string) => void;
    /** 右键菜单处理 */
    onContextMenu: (event: MouseEvent, theme: ExtendedTheme) => void;
}

/**
 * ThemeMatrix 主组件属性
 */
export interface ThemeMatrixProps {
    /** 应用状态存储 */
    appStore: AppStore;
}

/**
 * ThemeTable 组件属性
 */
export interface ThemeTableProps {
    /** Block模板列表 */
    blocks: BlockTemplate[];
    /** 主题树节点列表 */
    themeNodes: ThemeTreeNode[];
    /** 覆盖配置映射 */
    overridesMap: Map<string, ThemeOverride>;
    /** 选中的主题集合 */
    selectedThemes: Set<string>;
    /** 正在编辑的主题ID */
    editingThemeId: string | null;
    /** 事件处理器 */
    onCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void;
    onToggleSelect: (themeId: string, includeChildren: boolean) => void;
    onToggleExpand: (themeId: string) => void;
    onContextMenu: (event: MouseEvent, theme: ExtendedTheme) => void;
    onEditTheme: (themeId: string | null) => void;
    onUpdateTheme: (themeId: string, updates: Partial<ThemeDefinition>) => void;
}

/**
 * ThemeToolbar 组件属性
 */
export interface ThemeToolbarProps {
    /** 选中的主题数量 */
    selectedCount: number;
    /** 总主题数量 */
    totalCount: number;
    /** 是否显示归档主题 */
    showArchived: boolean;
    /** 全选处理 */
    onSelectAll: () => void;
    /** 清除选择处理 */
    onClearSelection: () => void;
    /** 批量操作处理 */
    onBatchOperation: () => void;
    /** 切换显示归档 */
    onToggleShowArchived: (show: boolean) => void;
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
