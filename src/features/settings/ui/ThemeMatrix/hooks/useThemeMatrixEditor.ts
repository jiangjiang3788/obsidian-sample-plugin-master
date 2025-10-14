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
  handleSelection: (type: 'theme' | 'block', id: string, isSelected: boolean) => void;
  handleSelectAll: (type: 'theme' | 'block', allIds: string[]) => void;
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
  const handleSelection = useCallback((type: 'theme' | 'block', id: string, isSelected: boolean) => {
    console.log('【调试】handleSelection 触发', { type, id, isSelected });
    setEditorState(prev => {
      console.log('【调试】当前状态 (prev)', prev);
      const newState = { ...prev };
      let currentSelectionType = prev.selectionType;

      // 如果是第一次选择，则确定当前的选择类型
      if (prev.selectedThemes.size === 0 && prev.selectedCells.size === 0) {
        currentSelectionType = type;
      }

      if (type === 'theme') {
        const newSelectedThemes = new Set(prev.selectedThemes);
        if (isSelected) {
          newSelectedThemes.add(id);
        } else {
          newSelectedThemes.delete(id);
        }
        newState.selectedThemes = newSelectedThemes;
      } else { // type === 'block'
        const newSelectedCells = new Set(prev.selectedCells);
        if (isSelected) {
          newSelectedCells.add(id);
        } else {
          newSelectedCells.delete(id);
        }
        newState.selectedCells = newSelectedCells;
      }
      
      // 如果所有选择都已取消，则重置选择类型
      if (newState.selectedThemes.size === 0 && newState.selectedCells.size === 0) {
        newState.selectionType = 'none';
      } else {
        newState.selectionType = currentSelectionType;
      }

      console.log('【调试】更新后状态 (newState)', newState);
      return newState;
    });
  }, []);

  /**
   * 处理全选事件
   */
  const handleSelectAll = useCallback((type: 'theme' | 'block', allIds: string[]) => {
    // 实现全选逻辑
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
    handleSelection,
    handleSelectAll,
    clearSelection,
    getSelectionStats,
  };
}
