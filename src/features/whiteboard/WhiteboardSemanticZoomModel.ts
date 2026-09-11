import { clampWhiteboardZoom } from './WhiteboardZoomModel';

export const WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM = 0.35;
export const WHITEBOARD_SEMANTIC_OVERVIEW_MAX_ZOOM = 0.1;

export type WhiteboardSemanticZoomLevel = 'detail' | 'compact' | 'overview';

export interface WhiteboardSemanticZoomState {
  level: WhiteboardSemanticZoomLevel;
  zoom: number;
  inverseZoom: number;
  showCardLocators: boolean;
  showGroupLocators: boolean;
  showAnnotationLocators: boolean;
}

export function getWhiteboardSemanticZoomState(value: number): WhiteboardSemanticZoomState {
  const zoom = clampWhiteboardZoom(value);
  const level: WhiteboardSemanticZoomLevel = zoom >= WHITEBOARD_SEMANTIC_DETAIL_MIN_ZOOM
    ? 'detail'
    : zoom >= WHITEBOARD_SEMANTIC_OVERVIEW_MAX_ZOOM
      ? 'compact'
      : 'overview';
  return {
    level,
    zoom,
    inverseZoom: 1 / zoom,
    showCardLocators: level !== 'detail',
    showGroupLocators: level !== 'detail',
    showAnnotationLocators: level === 'overview',
  };
}

export function getWhiteboardSemanticZoomStyle(state: WhiteboardSemanticZoomState): string {
  return `--think-whiteboard-semantic-inverse-zoom:${state.inverseZoom}`;
}

export function getWhiteboardSemanticZoomStatus(
  state: WhiteboardSemanticZoomState,
  cardCount: number,
  groupCount: number,
): string | null {
  if (state.level === 'detail') return null;
  if (state.level === 'compact') return `简化视图：${cardCount} 卡片 · ${groupCount} 工作台 · Ctrl/⌘ 框选或点选，拖动可移动；卡片可拖回左栏移出，右键可整理`;
  return `概览模式：${cardCount} 卡片 · ${groupCount} 工作台 · 拖动 Locator 可移动；卡片可拖回左栏移出，文字标注也可拖动`;
}
