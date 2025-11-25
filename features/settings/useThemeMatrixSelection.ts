/**
 * 简化的主题矩阵选择管理Hook
 * 重构后只支持两种模式：theme 和 block
 */
import { useState, useCallback, useMemo } from 'preact/hooks';
import type { ThemeTreeNode } from './index';
import { getDescendantIds } from './themeTreeBuilder';

/**
 * 简化的选择模式（只有两种）
 */
export type ThemeMatrixMode = 'theme' | 'block';

/**
 * 简化的选择状态
 */
export interface ThemeMatrixSelection {
  mode: ThemeMatrixMode;
  selectedThemes: Set<string>;
  selectedBlocks: Map<string, Set<string>>; // blockId -> Set<themeId>
}

/**
 * 选择统计信息
 */
export interface SelectionStats {
  themes: number;
  blocks: number;
  total: number;
}

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  mode: ThemeMatrixMode;
  operation: BatchOperationType;
  targets: string[];
  params?: {
    icon?: string;
    template?: any;
  };
}

/**
 * 批量操作类型
 */
export type BatchOperationType = 
  // 主题模式操作
  | 'activate'
  | 'archive' 
  | 'delete'
  | 'setIcon'
  | 'toggleEdit'
  // Block模式操作
  | 'setInherit'
  | 'setOverride'
  | 'setDisabled'
  | 'applyTemplate';

/**
 * 创建空的选择状态
 */
function createEmptySelection(): ThemeMatrixSelection {
  return {
    mode: 'theme',
    selectedThemes: new Set(),
    selectedBlocks: new Map()
  };
}

/**
 * 简化的主题矩阵选择管理Hook
 */
export function useThemeMatrixSelection(themeTree: ThemeTreeNode[]) {
  // 选择状态
  const [selection, setSelection] = useState<ThemeMatrixSelection>(createEmptySelection());
  
  // 上一次选择的项目（用于范围选择）
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // 获取选择统计
  const selectionStats = useMemo((): SelectionStats => {
    const themes = selection.selectedThemes.size;
    const blocks = Array.from(selection.selectedBlocks.values())
      .reduce((sum: number, themeSet: Set<string>) => sum + themeSet.size, 0);
    
    return {
      themes,
      blocks,
      total: themes + blocks
    };
  }, [selection]);
  
  /**
   * 切换选择模式
   */
  const setMode = useCallback((mode: ThemeMatrixMode) => {
    setSelection(prev => ({
      ...createEmptySelection(),
      mode
    }));
    setLastSelectedId(null);
  }, []);
  
  /**
   * 选择/取消选择主题
   */
  const toggleThemeSelection = useCallback((
    themeId: string,
    includeChildren: boolean = false,
    event?: MouseEvent
  ) => {
    if (selection.mode !== 'theme') return;
    
    setSelection(prev => {
      const newThemes = new Set(prev.selectedThemes);
      
      // 处理Shift键范围选择
      if (event?.shiftKey && lastSelectedId) {
        const range = getThemeRange(themeTree, lastSelectedId, themeId);
        range.forEach(id => newThemes.add(id));
      }
      // 处理Ctrl键多选
      else if (event?.ctrlKey || event?.metaKey) {
        if (newThemes.has(themeId)) {
          newThemes.delete(themeId);
          // 如果包含子节点，也删除子节点
          if (includeChildren) {
            const node = findNodeInTree(themeTree, themeId);
            if (node) {
              const descendants = getDescendantIds(node);
              descendants.forEach(id => newThemes.delete(id));
            }
          }
        } else {
          newThemes.add(themeId);
          // 如果包含子节点，也添加子节点
          if (includeChildren) {
            const node = findNodeInTree(themeTree, themeId);
            if (node) {
              const descendants = getDescendantIds(node);
              descendants.forEach(id => newThemes.add(id));
            }
          }
        }
      }
      // 普通点击
      else {
        // 如果不是多选，先清空
        if (!event?.ctrlKey && !event?.metaKey) {
          newThemes.clear();
        }
        
        if (newThemes.has(themeId)) {
          newThemes.delete(themeId);
          if (includeChildren) {
            const node = findNodeInTree(themeTree, themeId);
            if (node) {
              const descendants = getDescendantIds(node);
              descendants.forEach(id => newThemes.delete(id));
            }
          }
        } else {
          newThemes.add(themeId);
          if (includeChildren) {
            const node = findNodeInTree(themeTree, themeId);
            if (node) {
              const descendants = getDescendantIds(node);
              descendants.forEach(id => newThemes.add(id));
            }
          }
        }
      }
      
      return {
        ...prev,
        selectedThemes: newThemes
      };
    });
    
    setLastSelectedId(themeId);
  }, [selection.mode, themeTree, lastSelectedId]);
  
  /**
   * 选择/取消选择Block列
   */
  const toggleBlockSelection = useCallback((
    blockId: string,
    themeIds: string[],
    event?: MouseEvent
  ) => {
    if (selection.mode !== 'block') return;
    
    setSelection(prev => {
      const newBlocks = new Map(prev.selectedBlocks);
      
      if (event?.ctrlKey || event?.metaKey) {
        // Ctrl键多选
        if (newBlocks.has(blockId)) {
          newBlocks.delete(blockId);
        } else {
          newBlocks.set(blockId, new Set(themeIds));
        }
      } else {
        // 普通点击
        newBlocks.clear();
        newBlocks.set(blockId, new Set(themeIds));
      }
      
      return {
        ...prev,
        selectedBlocks: newBlocks
      };
    });
  }, [selection.mode]);
  
  /**
   * 全选当前模式下的所有项目
   */
  const selectAll = useCallback(() => {
    setSelection(prev => {
      if (prev.mode === 'theme') {
        // 选择所有主题
        const allThemeIds = getAllThemeIds(themeTree);
        return {
          ...prev,
          selectedThemes: new Set(allThemeIds)
        };
      } else {
        // Block模式的全选需要外部提供Block列表
        // 这里暂时不实现，由调用方处理
        return prev;
      }
    });
  }, [themeTree]);
  
  /**
   * 清空所有选择
   */
  const clearSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedThemes: new Set(),
      selectedBlocks: new Map()
    }));
    setLastSelectedId(null);
  }, []);
  
  /**
   * 判断主题是否被选中
   */
  const isThemeSelected = useCallback((themeId: string): boolean => {
    return selection.selectedThemes.has(themeId);
  }, [selection.selectedThemes]);
  
  /**
   * 判断Block是否被选中
   */
  const isBlockSelected = useCallback((blockId: string): boolean => {
    return selection.selectedBlocks.has(blockId);
  }, [selection.selectedBlocks]);
  
  /**
   * 判断主题是否部分选中（子节点被选中）
   */
  const isPartiallySelected = useCallback((themeId: string): boolean => {
    const node = findNodeInTree(themeTree, themeId);
    if (!node || node.children.length === 0) {
      return false;
    }
    
    const descendants = getDescendantIds(node);
    const hasSelectedDescendant = descendants.some(
      id => selection.selectedThemes.has(id)
    );
    const isFullySelected = selection.selectedThemes.has(themeId);
    
    return hasSelectedDescendant && !isFullySelected;
  }, [themeTree, selection.selectedThemes]);
  
  /**
   * 获取选中的主题ID列表
   */
  const getSelectedThemeIds = useCallback((): string[] => {
    return Array.from(selection.selectedThemes);
  }, [selection.selectedThemes]);
  
  /**
   * 获取选中的Block配置
   */
  const getSelectedBlockConfigs = useCallback((): Array<{blockId: string; themeIds: string[]}> => {
    return Array.from(selection.selectedBlocks.entries()).map(([blockId, themeIds]: [string, Set<string>]) => ({
      blockId,
      themeIds: Array.from(themeIds)
    }));
  }, [selection.selectedBlocks]);
  
  return {
    // 状态
    selection,
    selectionStats,
    mode: selection.mode,
    
    // 方法
    setMode,
    toggleThemeSelection,
    toggleBlockSelection,
    selectAll,
    clearSelection,
    isThemeSelected,
    isBlockSelected,
    isPartiallySelected,
    getSelectedThemeIds,
    getSelectedBlockConfigs
  };
}

/**
 * 在树中查找节点
 */
function findNodeInTree(
  tree: ThemeTreeNode[],
  themeId: string
): ThemeTreeNode | null {
  for (const node of tree) {
    if (node.theme.id === themeId) {
      return node;
    }
    const found = findNodeInTree(node.children, themeId);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * 获取所有主题ID
 */
function getAllThemeIds(tree: ThemeTreeNode[]): string[] {
  const ids: string[] = [];
  
  function traverse(nodes: ThemeTreeNode[]) {
    for (const node of nodes) {
      ids.push(node.theme.id);
      traverse(node.children);
    }
  }
  
  traverse(tree);
  return ids;
}

/**
 * 获取两个主题之间的范围
 */
function getThemeRange(
  tree: ThemeTreeNode[],
  startId: string,
  endId: string
): string[] {
  const allIds = getAllThemeIds(tree);
  const startIndex = allIds.indexOf(startId);
  const endIndex = allIds.indexOf(endId);
  
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }
  
  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);
  
  return allIds.slice(minIndex, maxIndex + 1);
}
