/**
 * 选择模式管理Hook
 */
import { useState, useCallback, useMemo } from 'preact/hooks';
import type { 
    SelectionMode, 
    SelectionState, 
    SelectionStats,
    SelectionEvent 
} from '../types/selection.types';
import {
    createEmptySelectionState,
    getSelectionStats,
    clearSelectionByMode,
    clearAllSelections,
    createCellKey,
    isItemSelected,
    toggleItemSelection
} from '../types/selection.types';
import type { ThemeTreeNode } from '../types';
import { getDescendantIds } from '../utils/themeTreeBuilder';

/**
 * 选择模式管理Hook
 */
export function useSelectionMode(themeTree: ThemeTreeNode[]) {
    // 选择状态
    const [selectionState, setSelectionState] = useState<SelectionState>(
        createEmptySelectionState()
    );
    
    // 上一次选择的项目（用于范围选择）
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    
    // 获取选择统计
    const selectionStats = useMemo(
        () => getSelectionStats(selectionState),
        [selectionState]
    );
    
    /**
     * 切换选择模式
     */
    const setMode = useCallback((mode: SelectionMode) => {
        setSelectionState(prev => ({
            ...clearAllSelections(prev),
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
        setSelectionState(prev => {
            const newState = { ...prev };
            const newThemes = new Set(prev.selectedThemes);
            
            // 处理Shift键范围选择
            if (event?.shiftKey && lastSelectedId && prev.mode === 'theme') {
                const range = getThemeRange(themeTree, lastSelectedId, themeId);
                range.forEach(id => newThemes.add(id));
            }
            // 处理Ctrl键多选
            else if (event?.ctrlKey || event?.metaKey) {
                if (newThemes.has(themeId)) {
                    newThemes.delete(themeId);
                } else {
                    newThemes.add(themeId);
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
            
            newState.selectedThemes = newThemes;
            return newState;
        });
        
        setLastSelectedId(themeId);
    }, [themeTree, lastSelectedId]);
    
    /**
     * 选择/取消选择Block列
     */
    const toggleBlockSelection = useCallback((
        blockId: string,
        event?: MouseEvent
    ) => {
        setSelectionState(prev => {
            const newState = { ...prev };
            const newBlocks = new Set(prev.selectedBlocks);
            
            if (event?.ctrlKey || event?.metaKey) {
                // Ctrl键多选
                if (newBlocks.has(blockId)) {
                    newBlocks.delete(blockId);
                } else {
                    newBlocks.add(blockId);
                }
            } else {
                // 普通点击
                newBlocks.clear();
                newBlocks.add(blockId);
            }
            
            newState.selectedBlocks = newBlocks;
            return newState;
        });
    }, []);
    
    /**
     * 选择/取消选择单元格
     */
    const toggleCellSelection = useCallback((
        themeId: string,
        blockId: string,
        event?: MouseEvent
    ) => {
        const cellKey = createCellKey(themeId, blockId);
        
        setSelectionState(prev => {
            const newState = { ...prev };
            const newCells = new Set(prev.selectedCells);
            
            if (event?.ctrlKey || event?.metaKey) {
                // Ctrl键多选
                if (newCells.has(cellKey)) {
                    newCells.delete(cellKey);
                } else {
                    newCells.add(cellKey);
                }
            } else {
                // 普通点击
                newCells.clear();
                newCells.add(cellKey);
            }
            
            newState.selectedCells = newCells;
            return newState;
        });
    }, []);
    
    /**
     * 全选当前模式下的所有项目
     */
    const selectAll = useCallback(() => {
        setSelectionState(prev => {
            const newState = { ...prev };
            
            switch (prev.mode) {
                case 'theme':
                    // 选择所有主题
                    const allThemeIds = getAllThemeIds(themeTree);
                    newState.selectedThemes = new Set(allThemeIds);
                    break;
                case 'block':
                    // Block全选需要知道所有Block ID，这里暂时不实现
                    break;
                case 'cell':
                    // Cell全选需要知道所有组合，这里暂时不实现
                    break;
            }
            
            return newState;
        });
    }, [themeTree]);
    
    /**
     * 清空所有选择
     */
    const clearSelection = useCallback(() => {
        setSelectionState(clearAllSelections);
        setLastSelectedId(null);
    }, []);
    
    /**
     * 判断项目是否被选中
     */
    const isSelected = useCallback((
        id: string,
        mode?: SelectionMode
    ): boolean => {
        const checkMode = mode || selectionState.mode;
        return isItemSelected(selectionState, checkMode, id);
    }, [selectionState]);
    
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
            id => selectionState.selectedThemes.has(id)
        );
        const isFullySelected = selectionState.selectedThemes.has(themeId);
        
        return hasSelectedDescendant && !isFullySelected;
    }, [themeTree, selectionState.selectedThemes]);
    
    return {
        // 状态
        selectionState,
        selectionStats,
        mode: selectionState.mode,
        
        // 方法
        setMode,
        toggleThemeSelection,
        toggleBlockSelection,
        toggleCellSelection,
        selectAll,
        clearSelection,
        isSelected,
        isPartiallySelected,
        
        // 获取选中的ID
        getSelectedThemeIds: () => Array.from(selectionState.selectedThemes),
        getSelectedBlockIds: () => Array.from(selectionState.selectedBlocks),
        getSelectedCells: () => Array.from(selectionState.selectedCells)
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
