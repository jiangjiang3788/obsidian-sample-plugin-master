import { useState, useCallback, useMemo } from 'preact/hooks';

/**
 * 编辑器状态定义
 */
export interface EditorState {
  /** 当前模式: 'view' (预览) 或 'edit' (编辑) */
  mode: 'view' | 'edit';
  /** 当前选择的实体类型 */
  selectionType: 'none' | 'theme' | 'block';
  /** 选中的主题ID集合 */
  selectedThemes: Set<string>;
  /** 选中的单元格ID集合 (格式: `${themeId}:${blockId}`) */
  selectedCells: Set<string>;
}

/**
 * useThemeMatrixEditor Hook 的返回类型
 */
export interface UseThemeMatrixEditorReturn {
  editorState: EditorState;
  toggleEditMode: () => void;
  handleSelectionChange: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
  handleSelectAll: (allThemeIds: string[], isSelected: boolean) => void;
  handleSelectBlockColumn: (blockId: string, allThemeIds: string[], isSelected: boolean) => void;
  clearSelection: () => void;
  getSelectionStats: () => { count: number; type: 'none' | 'theme' | 'block' };
}

const INITIAL_STATE: EditorState = {
  mode: 'view',
  selectionType: 'none',
  selectedThemes: new Set(),
  selectedCells: new Set(),
};

/**
 * 管理 ThemeMatrix 编辑器状态和交互逻辑的 Hook
 */
export function useThemeMatrixEditor(): UseThemeMatrixEditorReturn {
  const [editorState, setEditorState] = useState<EditorState>(INITIAL_STATE);

  /**
   * 切换预览/编辑模式
   */
  const toggleEditMode = useCallback(() => {
    setEditorState(prev => ({
      ...INITIAL_STATE, // 切换模式时重置所有状态
      mode: prev.mode === 'view' ? 'edit' : 'view',
    }));
  }, []);

  /**
   * 清除所有选择
   */
  const clearSelection = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      selectionType: 'none',
      selectedThemes: new Set(),
      selectedCells: new Set(),
    }));
  }, []);

  /**
   * 处理单个项目选择事件
   */
  const handleSelectionChange = useCallback((type: 'theme' | 'block', id: string, isSelected: boolean) => {
    setEditorState(prev => {
      let currentSelectedThemes = prev.selectedThemes;
      let currentSelectedCells = prev.selectedCells;

      // 核心逻辑：当从一种选择类型切换到另一种时，清空之前的选择。
      // 例如，如果当前正在选择主题 (selectionType === 'theme')，然后用户点击了一个块 (type === 'block')
      if (prev.selectionType !== type && prev.selectionType !== 'none') {
        currentSelectedThemes = new Set();
        currentSelectedCells = new Set();
      }

      const newSelectedThemes = new Set(currentSelectedThemes);
      const newSelectedCells = new Set(currentSelectedCells);

      if (type === 'theme') {
        isSelected ? newSelectedThemes.add(id) : newSelectedThemes.delete(id);
      } else { // type === 'block'
        isSelected ? newSelectedCells.add(id) : newSelectedCells.delete(id);
      }

      const newSelectionType = newSelectedThemes.size > 0 ? 'theme' : (newSelectedCells.size > 0 ? 'block' : 'none');

      return {
        ...prev,
        selectedThemes: newSelectedThemes,
        selectedCells: newSelectedCells,
        selectionType: newSelectionType,
      };
    });
  }, []);

  /**
   * 处理全选事件 (所有主题)
   */
  const handleSelectAll = useCallback((allThemeIds: string[], isSelected: boolean) => {
    setEditorState(prev => {
      const newSelectedThemes = isSelected ? new Set(allThemeIds) : new Set<string>();

      return {
        ...prev,
        selectedThemes: newSelectedThemes,
        selectionType: newSelectedThemes.size > 0 ? 'theme' : 'none',
        selectedCells: new Set(), // 清除单元格选择
      };
    });
  }, []);

  /**
   * 处理按块列选择的事件
   */
  const handleSelectBlockColumn = useCallback((blockId: string, allThemeIds: string[], isSelected: boolean) => {
    setEditorState(prev => {
      const allCellIdsForBlock = allThemeIds.map(themeId => `${themeId}:${blockId}`);
      const newSelectedCells = new Set(prev.selectedCells);

      if (isSelected) {
        // 选择该列的所有单元格
        allCellIdsForBlock.forEach(cellId => newSelectedCells.add(cellId));
      } else {
        // 取消选择该列的所有单元格
        allCellIdsForBlock.forEach(cellId => newSelectedCells.delete(cellId));
      }

      return {
        ...prev,
        selectedCells: newSelectedCells,
        selectionType: newSelectedCells.size > 0 ? 'block' : 'none',
        selectedThemes: new Set(), // 清除主题选择
      };
    });
  }, []);

  /**
   * 获取选择统计信息
   */
  const getSelectionStats = useCallback(() => {
    const { selectionType, selectedThemes, selectedCells } = editorState;
    if (selectionType === 'theme') {
      return { count: selectedThemes.size, type: 'theme' as const };
    }
    if (selectionType === 'block') {
      return { count: selectedCells.size, type: 'block' as const };
    }
    return { count: 0, type: 'none' as const };
  }, [editorState]);

  return {
    editorState,
    toggleEditMode,
    handleSelectionChange,
    handleSelectAll,
    handleSelectBlockColumn,
    clearSelection,
    getSelectionStats,
  };
}
