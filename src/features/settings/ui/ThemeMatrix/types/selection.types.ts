/**
 * 选择状态相关类型定义
 */

/**
 * 选择模式
 */
export type SelectionMode = 'theme' | 'block' | 'cell';

/**
 * 选择状态
 */
export interface SelectionState {
  /** 当前选择模式 */
  mode: SelectionMode;
  /** 选中的主题ID集合 */
  selectedThemes: Set<string>;
  /** 选中的Block ID集合 */
  selectedBlocks: Set<string>;
  /** 选中的单元格集合（格式: "themeId:blockId"） */
  selectedCells: Set<string>;
}

/**
 * 选择统计信息
 */
export interface SelectionStats {
  /** 选中的主题数量 */
  themes: number;
  /** 选中的Block数量 */
  blocks: number;
  /** 选中的单元格数量 */
  cells: number;
  /** 总选择数量 */
  total: number;
}

/**
 * 选择操作类型
 */
export type SelectionAction = 
  | 'select'      // 选择
  | 'deselect'    // 取消选择
  | 'toggle'      // 切换选择
  | 'selectAll'   // 全选
  | 'deselectAll' // 取消全选
  | 'selectRange' // 范围选择
  | 'selectColumn' // 选择列
  | 'selectRow';   // 选择行

/**
 * 选择事件
 */
export interface SelectionEvent {
  /** 事件类型 */
  type: SelectionAction;
  /** 选择模式 */
  mode: SelectionMode;
  /** 目标ID */
  targetId?: string;
  /** 目标ID列表（用于范围选择） */
  targetIds?: string[];
  /** 是否包含子节点 */
  includeChildren?: boolean;
  /** 修饰键状态 */
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

/**
 * 创建空的选择状态
 */
export function createEmptySelectionState(): SelectionState {
  return {
    mode: 'theme',
    selectedThemes: new Set(),
    selectedBlocks: new Set(),
    selectedCells: new Set()
  };
}

/**
 * 获取选择统计信息
 */
export function getSelectionStats(state: SelectionState): SelectionStats {
  const themes = state.selectedThemes.size;
  const blocks = state.selectedBlocks.size;
  const cells = state.selectedCells.size;
  
  return {
    themes,
    blocks,
    cells,
    total: themes + blocks + cells
  };
}

/**
 * 清空指定模式的选择
 */
export function clearSelectionByMode(
  state: SelectionState, 
  mode: SelectionMode
): SelectionState {
  const newState = { ...state };
  
  switch (mode) {
    case 'theme':
      newState.selectedThemes = new Set();
      break;
    case 'block':
      newState.selectedBlocks = new Set();
      break;
    case 'cell':
      newState.selectedCells = new Set();
      break;
  }
  
  return newState;
}

/**
 * 清空所有选择
 */
export function clearAllSelections(state: SelectionState): SelectionState {
  return {
    ...state,
    selectedThemes: new Set(),
    selectedBlocks: new Set(),
    selectedCells: new Set()
  };
}

/**
 * 创建单元格键
 */
export function createCellKey(themeId: string, blockId: string): string {
  return `${themeId}:${blockId}`;
}

/**
 * 解析单元格键
 */
export function parseCellKey(key: string): { themeId: string; blockId: string } | null {
  const parts = key.split(':');
  if (parts.length !== 2) {
    return null;
  }
  return {
    themeId: parts[0],
    blockId: parts[1]
  };
}

/**
 * 从选择状态获取目标
 */
export function getTargetsFromSelection(state: SelectionState): {
  themeIds?: string[];
  blockIds?: string[];
  cells?: Array<{ themeId: string; blockId: string }>;
} {
  const targets: {
    themeIds?: string[];
    blockIds?: string[];
    cells?: Array<{ themeId: string; blockId: string }>;
  } = {};

  if (state.selectedThemes.size > 0) {
    targets.themeIds = Array.from(state.selectedThemes);
  }

  if (state.selectedBlocks.size > 0) {
    targets.blockIds = Array.from(state.selectedBlocks);
  }

  if (state.selectedCells.size > 0) {
    targets.cells = Array.from(state.selectedCells)
      .map(parseCellKey)
      .filter((cell): cell is { themeId: string; blockId: string } => cell !== null);
  }

  return targets;
}

/**
 * 判断项目是否被选中
 */
export function isItemSelected(
  state: SelectionState,
  mode: SelectionMode,
  id: string
): boolean {
  switch (mode) {
    case 'theme':
      return state.selectedThemes.has(id);
    case 'block':
      return state.selectedBlocks.has(id);
    case 'cell':
      return state.selectedCells.has(id);
    default:
      return false;
  }
}

/**
 * 切换项目选择状态
 */
export function toggleItemSelection(
  state: SelectionState,
  mode: SelectionMode,
  id: string
): SelectionState {
  const newState = { ...state };
  
  switch (mode) {
    case 'theme':
      const newThemes = new Set(state.selectedThemes);
      if (newThemes.has(id)) {
        newThemes.delete(id);
      } else {
        newThemes.add(id);
      }
      newState.selectedThemes = newThemes;
      break;
      
    case 'block':
      const newBlocks = new Set(state.selectedBlocks);
      if (newBlocks.has(id)) {
        newBlocks.delete(id);
      } else {
        newBlocks.add(id);
      }
      newState.selectedBlocks = newBlocks;
      break;
      
    case 'cell':
      const newCells = new Set(state.selectedCells);
      if (newCells.has(id)) {
        newCells.delete(id);
      } else {
        newCells.add(id);
      }
      newState.selectedCells = newCells;
      break;
  }
  
  return newState;
}
